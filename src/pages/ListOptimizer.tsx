import React, { forwardRef, useImperativeHandle, useState } from 'react';

import { Settings } from 'trading-lib';

import { Scripts } from '../components/Scripts';
import { Mode } from '../Modes';
import { Data } from '../services/Loader';
import { SimulationSettings } from '../services/SimulationSettings';
import { Evaluation, list } from '../services/Optimization';
import { LineGraph } from '../components/LineGraph';
import { Display } from '../services/Display';
import { colors } from '../render/Render';

export const ListOptimizer = forwardRef<
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
    [key: string]: {
      value: string;
      valueIndex: number;
      evaluation: Evaluation;
    }[]
  }>({});

  useImperativeHandle(ref, () => ({
    run: async () => {
      if (!script) return;

      setScores({});

      let keepScores: {
        [key: string]: {
          value: string;
          valueIndex: number;
          evaluation: Evaluation;
        }[]
      } = {};

      await list(
        script, 
        await getData(simSettings.simulationInterval), 
        mode, 
        settings, 
        simSettings,
        (key, value, valueIndex, score) => {
          const newScores = {...keepScores};

          if (!(key in newScores)) {
            newScores[key] = [];
          }

          console.log(key, value, score);

          newScores[key] = [
            ...newScores[key], 
            {
              value: value,
              valueIndex: valueIndex,
              evaluation: score
            }
          ].sort((a, b) => a.valueIndex - b.valueIndex);

          keepScores = newScores;
          setScores(newScores);
        }
      );
    }
  }));

  return (
    <>
      <div className="left">
        {Object.keys(scores).map(key => (
          <div className="container" key={key}>
            <div className="container-header">{key[0].toUpperCase() + key.slice(1)}</div>
            <LineGraph 
              x={scores[key].map(s => s.value)} 
              y={[scores[key].map(s => isNaN(s.evaluation.evaluation) || !isFinite(s.evaluation.evaluation) ? 0 : s.evaluation.evaluation)]} 
              colors={[colors.green]} 
              xFormat={Display.numToString} 
              yFormat={Display.numToString} 
              log={false} 
              strictX={true} 
            />
          </div>
        ))}
      </div>

      <div className="middle">
        <Scripts onChange={script => setScript(script)} />
      </div>

      <div className="right">
        
      </div>
    </>
  );
})
