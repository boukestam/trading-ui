import React, {useEffect, useState} from 'react';

import './App.css';

import { Candles, compileScript } from 'trading-lib';

import { SimulationCandles } from './SimulationCandles';
import { StrategyEvent, StrategyProgressEvent, OutputTrade, SimulationResult } from './Simulation';
import { dateToString, render, renderLines } from './Render';

import { Result } from './Result';
import { getScript, Scripts } from './Scripts';
import { Trades } from './Trades';
import { Mode, modes, settings, simSettings } from './Modes';
import { Monthly } from './Monthly';
import { annealing, genetic, list } from './Optimization';
import { runInWorker } from './Worker';
import { Data, load } from './Loader';
import { Display } from './Display';
import { Performance } from './Performance';
import { Analysis } from './Analysis';

interface State {
  balanceHistory: number[][]
  portfolioHistory: number[][]
}

const state: State = {
  balanceHistory: [[], []],
  portfolioHistory: [[], []]
};

const renderTrade = (trade: OutputTrade, data: Data[], mode: Mode, script: string) => {
  if (data.length === 0) return;

  const tradeData = data.find(d => d.symbol === trade.symbol);
  if (!tradeData) return;

  let candles: Candles = new SimulationCandles(tradeData.buffer, simSettings(mode).dataInterval);

  const compiled = compileScript(getScript(script));

  render(
    document.getElementById('candle-canvas') as HTMLCanvasElement,
    candles, 
    trade.buyDate.getTime() / 1000,
    trade.sellDate.getTime() / 1000,
    [{
      side: trade.direction,
      openTime: trade.buyDate.getTime() / 1000,
      closeTime: trade.sellDate.getTime() / 1000,
      openPrice: trade.buy,
      closePrice: trade.sell
    }],
    {
      ...settings(mode),
      ...compiled.options
    },
    compiled.plot
  );
};

function App() {
  const [progress, setProgress] = useState<number>(0);
  const [trades, setTrades] = useState<OutputTrade[]>([]);
  const [data, setData] = useState<Data[]>([]);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [script, setScript] = useState<string | null>(null);
  const [mode, setMode] = useState<string>('alts');

  const getData = async (simulationInterval: string) => {
    let loadedData;

    if (data.length === 0) {
      loadedData = await Promise.all(
        simSettings(modes[mode]).symbols.map(symbol => load(modes[mode], symbol, simulationInterval))
      );
      setData(loadedData);
    } else {
      loadedData = data;
    }

    return loadedData;
  }

  const run = async () => {
    setResult(null);
    state.balanceHistory = [[], []];
    state.portfolioHistory = [[], []];

    if (!script) return;

    const result = await runInWorker(
      modes[mode], 
      await getData(simSettings(modes[mode]).simulationInterval), 
      getScript(script), 
      null, 
      settings(modes[mode]),
      simSettings(modes[mode]),
      (event: StrategyEvent) => {
        if (event.type === 'progress') {
          const progressEvent = event as StrategyProgressEvent;
          
          state.balanceHistory[0].push(progressEvent.data.time);
          state.balanceHistory[1].push(progressEvent.data.balance);
          
          state.portfolioHistory[0].push(progressEvent.data.time);
          state.portfolioHistory[1].push(progressEvent.data.portfolio);
    
          renderLines(
            document.getElementById('balance-canvas') as HTMLCanvasElement,
            state.balanceHistory[0],
            [
              //state.balanceHistory[1], 
              state.portfolioHistory[1]
            ],
            [
              //'#ff6f00',
              '#5466fd'
            ],
            dateToString,
            Display.number,
            true
          );
    
          setTrades(event.data.trades);
    
          setProgress(progressEvent.data.percentage);
        } else {
          console.log(event);
        }
      }
    );

    console.log(result);
    console.log(result.trades.filter(t => t.filled && !t.closed));

    setResult(result);
  };

  useEffect(() => {
    const doneTrades = trades.filter(trade => trade.closed);
    if (doneTrades.length > 0) {
      renderTrade(doneTrades[doneTrades.length - 1], data, modes[mode], script as string);
    }
  }, [trades, data, mode, script]);

  const optimize = (f: any) => {
    if (!script) return;
    getData(simSettings(modes[mode]).simulationInterval).then(data => {
      f(
        script, 
        data, 
        modes[mode], 
        settings(modes[mode]), 
        simSettings(modes[mode])
      );
    });
  };

  return (
    <div className="App">
      <div className="left">
        <Scripts onChange={script => setScript(script)} />
        <canvas id="balance-canvas" className="container"></canvas>
        {result && <Performance result={result}/>}
      </div>

      <div className="middle">
        <canvas id="candle-canvas" className="container"></canvas>
        <Trades trades={trades} onClick={(trade) => renderTrade(trade, data, modes[mode], script as string)}/>
        {result && <Monthly result={result}/>}

        {result && <div className="container correlation">
          <table>
            <thead>
              <tr>
                <th></th>
                {simSettings(modes[mode]).symbols.map(symbol => <th key={symbol}>
                  {symbol}
                </th>)}
              </tr>
            </thead>
            <tbody>
              {simSettings(modes[mode]).symbols.map(symbolX => <tr key={symbolX}>
                <td>{symbolX}</td>
                {simSettings(modes[mode]).symbols.map(symbolY => <td key={symbolY}>{
                  Display.number(Analysis.correlation(
                    new SimulationCandles(
                      data.find(d => d.symbol === symbolX)!.buffer, simSettings(modes[mode]).dataInterval
                    ),
                    new SimulationCandles(
                      data.find(d => d.symbol === symbolY)!.buffer, simSettings(modes[mode]).dataInterval
                    )
                  )
                )}</td>)}
              </tr>)}
            </tbody>
          </table>
        </div>}
      </div>

      <div className="right">
        <div className="controls container">
          <div className="control-buttons">
            <button onClick={run}>Run</button>
            <button onClick={() => optimize(annealing)}>Annealing</button>
            <button onClick={() => optimize(genetic)}>Genetic</button>
            <button onClick={() => optimize(list)}>List</button>
          </div>

          <div className="progress">
            <div className="progress-bar" style={{width: progress === 0 ? 0 : 'calc(' + progress + '% + 2px)'}}></div>
            <div className={`progress-text ${progress > 50 && 'progress-text-covered'}`}>{progress}%</div>
          </div>

          <div>
            <select value={mode} onChange={e => {
              setMode(e.target.value);
              setData([]);
              setResult(null);
            }}>
              {Object.keys(modes).map(key => 
                <option key={key} value={key}>{key[0].toUpperCase() + key.slice(1)}</option>
              )}
            </select>
          </div>
        </div>

        {result && <Result result={result} simSettings={result.simSettings} settings={result.settings}/>}
      </div>
    </div>
  );
}

export default App;
