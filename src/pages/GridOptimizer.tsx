import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

import { compileScript, Settings } from 'trading-lib';

import { getScript, Scripts } from '../components/Scripts';
import { Mode } from '../Modes';
import { Data } from '../services/Loader';
import { SimulationSettings } from '../services/SimulationSettings';
import { Evaluation, grid } from '../services/Optimization';
import { Graph3D } from '../components/Graph3D';

interface GridScore {
  xKey: string;
  xValue: number;
  yKey: string;
  yValue: number;
  evaluation: Evaluation;
};

export const GridOptimizer = forwardRef<
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
  const [scores, setScores] = useState<GridScore[]>([]);
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const [variables, setVariables] = useState<string[]>([]);

  useEffect(() => {
    if (!script) return;

    const source = getScript(script);
    const compiled = compileScript(source);
    setVariables(Object.keys(compiled.options));
  }, [script]);

  useImperativeHandle(ref, () => ({
    run: async () => {
      if (!script) return;

      setScores([]);

      let keepScores: GridScore[] = [];

      await grid(
        script, 
        await getData(simSettings.simulationInterval), 
        mode, 
        settings, 
        simSettings,
        x,
        y,
        (xKey, xValue, yKey, yValue, score) => {
          console.log(xKey, xValue, yKey, yValue, score);
          keepScores = [...keepScores, {
            xKey,
            xValue,
            yKey,
            yValue,
            evaluation: score
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
          <div className="container-header">3D grid</div>
          <Graph3D 
            data={scores.map(score => [score.xValue, score.yValue, score.evaluation.evaluation])}
            axes={[x, y, 'Evaluation']} 
          />
        </div>

        <div className="container">
          <div className="container-header">Best</div>
          <div>
            {scores.length > 0 && scores.reduce((a, v) => a ? (v.evaluation.evaluation > a.evaluation.evaluation ? v : a) : v, scores[0]).xKey}
            {scores.length > 0 && scores.reduce((a, v) => a ? (v.evaluation.evaluation > a.evaluation.evaluation ? v : a) : v, scores[0]).xValue}
          </div>
          <div>
            {scores.length > 0 && scores.reduce((a, v) => a ? (v.evaluation.evaluation > a.evaluation.evaluation ? v : a) : v, scores[0]).yKey}
            {scores.length > 0 && scores.reduce((a, v) => a ? (v.evaluation.evaluation > a.evaluation.evaluation ? v : a) : v, scores[0]).yValue}
          </div>
        </div>
      </div>

      <div className="middle">
        <Scripts onChange={script => setScript(script)} />
      </div>

      <div className="right">
        <div className="container">
          <div className="container-header">Variables</div>
          <select value={x} onChange={e => setX(e.target.value)}>
            <option>Choose</option>
            {variables.map(variable => <option value={variable}>{variable}</option>)}
          </select>
          <select value={y} onChange={e => setY(e.target.value)}>
            <option>Choose</option>
            {variables.map(variable => <option value={variable}>{variable}</option>)}
          </select>
        </div>
      </div>
    </>
  );
})
