import { compileScript, Script, Settings } from "trading-lib";
import { Analysis } from "./Analysis";
import { Data } from "./Loader";
import { Mode } from "../Modes";
import { getScript } from "../components/Scripts";
import { runInWorker } from "./Worker";
import { SimulationSettings } from "./SimulationSettings";

interface Solution { [key: string]: any }

interface Evaluation {
  evaluation: number;
  balance: number;
  trades: number;
  maxDrawdown: number;
}

const evaluate = async (
  s: Solution,
  source: string,
  data: Data[], 
  mode: Mode,
  settings: Settings, 
  simSettings: SimulationSettings
): Promise<Evaluation> => {
  try {
    const result = await runInWorker(
      mode, 
      data, 
      source, 
      {...s},
      settings,
      simSettings
    );

    const performanceTrades = Analysis.getPerformanceTrades(result);

    const maxDrawdown = Analysis.maxDrawdown(performanceTrades);
    // const sharpeRatio = Analysis.sharpeRatio(
    //   performanceTrades,
    //   simSettings
    // );

    // const expectedValue = Analysis.monthlyROI(result, performanceTrades, sim);

    const evaluation = 
      //(Math.tanh(expectedValue * 100) + 1) * 0.01 * 
      //Math.sqrt(performanceTrades.length) * 
      (1 - maxDrawdown) * 
      Math.sqrt(result.balance)
    ;

    //const evaluation = (1 - maxDrawdown) * sharpeRatio;// * Math.sqrt(performanceTrades.length);

    //const evaluation = (1 - maxDrawdown) * result.balance;

    //console.log('Evaluation', s, `score = ${evaluation} drawdown = ${Display.percentage(maxDrawdown)} balance = ${Display.number(result.balance)} value = ${Display.percentage(expectedValue)} sharpeRatio = ${Display.percentage(sharpeRatio)} trades = ${Display.number(result.trades.length)}`);

    return {
      evaluation,
      balance: result.balance,
      trades: result.trades.length,
      maxDrawdown
    };
  } catch (e) {
    //console.error(e);

    return {
      evaluation: 0,
      balance: 0,
      trades: 0,
      maxDrawdown: 0
    };
  }
};

const randomNeighbour = (solution: Solution, compiled: Script): Solution => {
  const neighbours = [];
  for (const key in compiled.optimize) {
    const options = compiled.optimize[key];

    neighbours.push({
      key: key,
      value: randomValue(options)
    });

    if (options.values) {
      const index = options.values.indexOf(solution[key]);
      if (index === -1) throw new Error("Option index not found");

      if (index > 0) {
        neighbours.push({
          key: key,
          value: options.values[index - 1]
        });
      }

      if (index < options.values.length - 1) {
        neighbours.push({
          key: key,
          value: options.values[index + 1]
        });
      }
    } else {
      if (solution[key] - options.step >= options.min) {
        neighbours.push({
          key: key,
          value: solution[key] - options.step
        });
      }

      if (solution[key] + options.step <= options.max) {
        neighbours.push({
          key: key,
          value: solution[key] + options.step
        });
      }
    }
  }

  const neighbourSolution = {...solution};

  const numChanges = Math.random() * neighbours.length * 0.2;

  for (let i = 0; i < numChanges; i++) {
    const neighbour = neighbours[Math.floor(Math.random() * neighbours.length)];
    neighbourSolution[neighbour.key] = neighbour.value;
  }

  return neighbourSolution;
};

const randomValue = (options: {
  min: number;
  max: number;
  step: number;
  values?: string[];
}) => {
  if (options.values) {
    return options.values[Math.floor(Math.random() * options.values.length)];
  }

  const steps = (options.max - options.min) / options.step;
  return options.min + Math.floor(Math.random() * steps) * options.step;
}

const randomSolution = (compiled: Script) => {
  const solution = {...compiled.options};

  for (const key in compiled.optimize) {
    const options = compiled.optimize[key];
    solution[key] = randomValue(options);
  }

  return solution;
};

export const annealing = async (
  script: string, 
  data: Data[], 
  mode: Mode,
  settings: Settings, 
  simSettings: SimulationSettings
) => {
  const source = getScript(script);
  const compiled = compileScript(source);

  let temperature = 1;
  const alpha = (t: number): number => t * 0.99;

  // Generate random solution
  let solution = randomSolution(compiled);
  let score = await evaluate(solution, source, data, mode, settings, simSettings);

  let best = solution;
  let bestScore = score;

  let iteration = 0;

  while (temperature > 0.001) {
    const neighbour = randomNeighbour(solution, compiled);
    const neighbourScore = await evaluate(neighbour, source, data, mode, settings, simSettings);

    const deltaCost = (1 / neighbourScore.evaluation) - (1 / score.evaluation);

    if (deltaCost < 0 || Math.random() < Math.pow(Math.E, -deltaCost / temperature)) {
      solution = neighbour;
      score = neighbourScore;
    }

    if (score.evaluation > bestScore.evaluation) {
      best = solution;
      bestScore = score;
    }
    
    if (bestScore.evaluation * 0.5 > score.evaluation) {
      solution = best;
      score = bestScore;
    }

    temperature = alpha(temperature);

    console.log(iteration, temperature, score, solution);
  }

  console.log('FINAL');
  console.log(score, solution);

  console.log('BEST');
  console.log(bestScore, best);
};

const promiseAllLimit = async <T>(n: number, list: (() => Promise<T>)[]) => {
  const head = list.slice(0, n)
  const tail = list.slice(n)
  const result: T[] = []
  const execute = async (promise: () => Promise<T>, i: number, runNext: () => Promise<void>) => {
    result[i] = await promise()
    await runNext()
  }
  const runNext = async () => {
    const i = list.length - tail.length
    const promise = tail.shift()
    if (promise !== undefined) {
      await execute(promise, i, runNext)
    }
  }
  await Promise.all(head.map((promise, i) => execute(promise, i, runNext)))
  return result
}

export const genetic = async (
  script: string, 
  data: Data[], 
  mode: Mode,
  settings: Settings, 
  simSettings: SimulationSettings
) => {
  const source = getScript(script);
  const compiled = compileScript(source);

  while (true) {
    let population: {
      solution: Solution;
      score?: Evaluation;
    }[] = [];

    // Generate random population
    for (let i = 0; i < 30; i++) {
      population.push({
        solution: randomSolution(compiled)
      });
    }

    for (let i = 0; i < 50; i++) {
      const scores: {
        score: Evaluation,
        solution: Solution
      }[] = [
        ...(population.filter(p => p.score) as {
          score: Evaluation,
          solution: Solution
        }[]),
        ...(await promiseAllLimit(
          10, 
          population.filter(p => !p.score).map(
            p => (
              async () => ({
                score: await evaluate(p.solution, source, data, mode, settings, simSettings),
                solution: p.solution
              })
            )
          )
        ))
      ];

      scores.sort((a, b) => b.score.evaluation - a.score.evaluation);

      console.log(i, scores[0].score, scores[0].solution);

      population = [];
      for (let i = 0; i < 10; i++) {
        population.push({
          solution: scores[i].solution,
          score: scores[i].score
        });
      }

      for (let i = 0; i < 10; i++) {
        let neighbour: Solution;

        do {
          neighbour = randomNeighbour(scores[i % 10].solution, compiled);
        } while (population.some(p => JSON.stringify(p.solution) === JSON.stringify(neighbour)))

        population.push({
          solution: neighbour
        });
      }

      for (let i = 0; i < 10; i++) {
        let random: Solution;

        do {
          random = randomSolution(compiled);
        } while (population.some(p => JSON.stringify(p.solution) === JSON.stringify(random)))

        population.push({
          solution: random
        });
      }

      //console.log(population);
    }

    console.log('Best', population[0].score, JSON.stringify(population[0].solution));
  }
};

export const list = async (
  script: string, 
  data: Data[], 
  mode: Mode,
  settings: Settings, 
  simSettings: SimulationSettings
) => {
  const source = getScript(script);
  const compiled = compileScript(source);

  for (const key in compiled.optimize) {
    const options = compiled.optimize[key];

    const promises = [];
    const values = [];

    if (options.values) {
      for (const val of options.values) {
        promises.push(() => evaluate({
          ...compiled.options,
          [key]: val
        }, source, data, mode, settings, simSettings));
        values.push(val);
      }
    } else {
      for (let val = options.min; val <= options.max; val += options.step) {
        promises.push(() => evaluate({
          ...compiled.options,
          [key]: val
        }, source, data, mode, settings, simSettings));
        values.push(val);
      }
    }

    const scores = await promiseAllLimit(10, promises);
    for (let i = 0; i < scores.length; i++) {
      console.log(key, values[i], scores[i]);
    }
  }
};