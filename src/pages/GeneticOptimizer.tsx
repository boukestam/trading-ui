import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

import { compileScript, Settings } from 'trading-lib';

import { getScript, Scripts } from '../components/Scripts';
import { Mode } from '../Modes';
import { Data } from '../services/Loader';
import { SimulationSettings } from '../services/SimulationSettings';
import { Evaluation, genetic, grid, Solution } from '../services/Optimization';
import { Graph3D } from '../components/Graph3D';
import { Display } from '../services/Display';

export const GeneticOptimizer = forwardRef<
  {
    run: () => Promise<void>;
  },
  {
    script: string | null,
    mode: Mode,
    settings: Settings,
    simSettings: SimulationSettings,
    setProgress: (progress: number) => void,
    setScript: (script: string) => void,
    getData: (simulationInterval: string) => Promise<Data[]>
  }
>(({setProgress, setScript, getData, script, mode, settings, simSettings}, ref) => {
  const [scores, setScores] = useState<{
    solution: Solution;
    score: Evaluation;
  }[]>([]);
  const [populationSize, setPopulationSize] = useState<number>(30);
  const [numIterations, setNumIterations] = useState<number>(50);

  useImperativeHandle(ref, () => ({
    run: async () => {
      if (!script) return;

      setScores([]);

      let keepScores: {
        solution: Solution;
        score: Evaluation;
      }[] = [];

      await genetic(
        script, 
        await getData(simSettings.simulationInterval), 
        mode, 
        settings, 
        simSettings,
        populationSize,
        numIterations,
        (index, solution, score) => {
          setProgress((index + 1) * (100 / numIterations));
        },
        (solution, score) => {
          keepScores = [...keepScores, {
            solution,
            score
          }];
          setScores(keepScores);
        }
      );
    }
  }));

  return (
    <>
      <div className="left">
        <div className="container">
          <div className="container-header">Runs</div>
          <table>
            <thead>
              <tr>
                <th>Balance</th>
                <th>Drawdown</th>
                <th>Trades</th>
                <th>Solution</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, scoreIndex) => <tr key={scoreIndex}>
                <td>{Display.number(s.score.balance)}</td>
                <td>{Display.percentage(s.score.maxDrawdown)}</td>
                <td>{Display.number(s.score.trades)}</td>
                <td><pre>{JSON.stringify(s.solution, null, 2)}</pre></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="middle">
        <Scripts onChange={script => setScript(script)} />
      </div>

      <div className="right">
        <div className="container">
          <div className="container-header">Settings</div>
          <div>
            Population: <input type="number" value={populationSize} onChange={e => setPopulationSize(parseInt(e.target.value))}/>
          </div>
          <div>
            Iterations: <input type="number" value={numIterations} onChange={e => setNumIterations(parseInt(e.target.value))}/>
          </div>
        </div>
      </div>
    </>
  );
})
