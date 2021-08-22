import React, { forwardRef, useImperativeHandle, useState } from 'react';

import { Settings } from 'trading-lib';

import { getScript, Scripts } from '../components/Scripts';
import { Mode } from '../Modes';
import { Data } from '../services/Loader';
import { SimulationSettings } from '../services/SimulationSettings';
import { Evaluation, runs } from '../services/Optimization';
import { Display } from '../services/Display';

const insertEntryCode = (source: string) => source.replace(/return /g, 'void ').replace('// [MONKEY_ENTRY]', `if (Math.random() < 0.04) {
  if (Math.random() < 0.66) {
    return {
      direction: 'long',
      limit: 'market',
      stop: close - exports.options.stopSize * lib.atr(
        candles, 
        exports.options.stopPeriod
      ),
      profit: Number.MAX_VALUE,
      meta: {
        strategy: 'trend'
      }
    };
  } else {
    return {
      direction: 'short',
      limit: 'market',
      stop: close + exports.options.stopSize * lib.atr(
        candles, 
        exports.options.stopPeriod
      ),
      profit: 0,
      meta: {
        strategy: 'trend'
      }
    };
  }
}`);

const insertExitCode = (source: string) => source.replace(/closePosition/g, 'void').replace('// [MONKEY_EXIT]', `for (const position of positions) {
  if (Math.random() < 1 / 24) {
    await closePosition(provider, position, exports.options.closeRatio);
  }
}`);

export const Monkey = forwardRef<
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
  const [scores, setScores] = useState<Evaluation[]>([]);
  const [numRuns, setNumRuns] = useState<number>(100);
  const [monkeyMode, setMonkeyMode] = useState<string>('entry');

  useImperativeHandle(ref, () => ({
    run: async () => {
      if (!script) return;

      const source = getScript(script);

      let monkeyCode = '';

      if (monkeyMode === 'entry') {
        monkeyCode = insertEntryCode(source);
      } else if (monkeyMode === 'exit') {
        monkeyCode = insertExitCode(source);
      } else if (monkeyMode === 'both') {
        monkeyCode = insertEntryCode(insertExitCode(source));
      }

      setScores([]);

      let keepScores: Evaluation[] = [];

      await runs(
        monkeyCode, 
        await getData(simSettings.simulationInterval), 
        mode, 
        settings, 
        simSettings,
        numRuns,
        (score) => {
          const newScores = [...keepScores];

          newScores.push(score);

          setProgress(newScores.length / numRuns * 100)

          keepScores = newScores;
          setScores(newScores);
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
              </tr>
            </thead>
            <tbody>
              {scores.map((score, scoreIndex) => <tr key={scoreIndex}>
                <td>{Display.number(score.balance)}</td>
                <td>{Display.percentage(score.maxDrawdown)}</td>
                <td>{Display.number(score.trades)}</td>
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
          <input type="number" value={numRuns} onChange={e => setNumRuns(parseInt(e.target.value))}/>
          <select value={monkeyMode} onChange={e => setMonkeyMode(e.target.value)}>
            <option value="entry">Entry</option>
            <option value="exit">Exit</option>
            <option value="both">Both</option>
          </select>
        </div>

        <div className="container">
          <div className="container-header">Analysis</div>
          <table>
            <thead>
              <tr>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{Display.percentage(scores.reduce((a, v) => a + (v.balance > 100 ? 1 : 0), 0) / scores.length)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
})
