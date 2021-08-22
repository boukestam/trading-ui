import React, {forwardRef, useEffect, useImperativeHandle, useState} from 'react';

import { Candles, compileScript, Settings } from 'trading-lib';

import { SimulationCandles } from '../services/SimulationCandles';
import { StrategyEvent, StrategyProgressEvent, OutputTrade, SimulationResult } from '../services/Simulation';
import { colors, dateToString } from '../render/Render';

import { Result } from '../components/Result';
import { getScript, Scripts } from '../components/Scripts';
import { Trades } from '../components/Trades';
import { Mode } from '../Modes';
import { Monthly } from '../components/Monthly';
import { runInWorker } from '../services/Worker';
import { Data } from '../services/Loader';
import { Display } from '../services/Display';
import { Performance } from '../components/Performance';
import { Correlations } from '../components/Correlations';
import { SimulationSettings } from '../services/SimulationSettings';
import { Interval } from '../components/Interval';
import { LineGraph } from '../components/LineGraph';
import { renderCandles } from '../render/Candles';

const renderSymbol = (symbol: string, data: Data[], settings: Settings, simSettings: SimulationSettings, script: string) => {
  if (data.length === 0) return;

  const tradeData = data.find(d => d.symbol === symbol);
  if (!tradeData) return;

  let candles: Candles = new SimulationCandles(tradeData.buffer, simSettings.dataInterval);

  const compiled = compileScript(getScript(script));

  renderCandles(
    document.getElementById('candle-canvas') as HTMLCanvasElement,
    candles, 
    candles.getOffset(0).time - 3600 * 24 * 2,
    candles.getOffset(0).time,
    [],
    {
      ...settings,
      ...compiled.options
    },
    compiled.plot
  );
};

const renderTrade = (trade: OutputTrade, data: Data[], settings: Settings, simSettings: SimulationSettings, script: string) => {
  if (data.length === 0) return;

  const tradeData = data.find(d => d.symbol === trade.symbol);
  if (!tradeData) return;

  let candles: Candles = new SimulationCandles(tradeData.buffer, simSettings.dataInterval);

  const compiled = compileScript(getScript(script));

  renderCandles(
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
      ...settings,
      ...compiled.options
    },
    compiled.plot
  );
};

export const Run = forwardRef<
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
  const [trades, setTrades] = useState<OutputTrade[]>([]);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [data, setData] = useState<Data[] | null>(null);

  const [times, setTimes] = useState<number[]>([]);
  const [portfolioHistory, setPortfolioHistory] = useState<number[]>([]);
  const [balanceHistory, setBalanceHistory] = useState<number[]>([]);

  useEffect(() => {
    getData(simSettings.simulationInterval).then(setData).catch(console.error);
  }, []);

  useImperativeHandle(ref, () => ({
    run: async () => {
      setResult(null);
  
      if (!script) return;
  
      const result = await runInWorker(
        mode, 
        await getData(simSettings.simulationInterval), 
        getScript(script), 
        null, 
        settings,
        simSettings,
        (event: StrategyEvent) => {
          if (event.type === 'progress') {
            const progressEvent = event as StrategyProgressEvent;

            setTimes(progressEvent.data.times);
            setPortfolioHistory(progressEvent.data.portfolioHistory);
            setBalanceHistory(progressEvent.data.balanceHistory);
      
            setTrades(event.data.trades);
      
            setProgress(progressEvent.data.percentage);
          } else {
            console.log(event);
          }
        },
        mode.verboseLogger
      );
  
      console.log(result);
      console.log(result.trades.filter(t => t.filled && !t.closed));
  
      setResult(result);
    }
  }));

  useEffect(() => {
    const doneTrades = trades.filter(trade => trade.closed);
    if (doneTrades.length > 0) {
      getData(simSettings.simulationInterval).then(data => {
        renderTrade(doneTrades[doneTrades.length - 1], data, settings, simSettings, script as string);
      });
    }
  }, [trades, mode, script]);

  return (
    <>
      <div className="left">
        <div className="container">
          <div className="container-header">Portolio</div>
          <LineGraph x={times} y={[portfolioHistory]} colors={[colors.green]} xFormat={dateToString} yFormat={Display.numToString} log={true} />
        </div>

        {result && <Performance result={result}/>}

        {result && <Interval result={result}/>}

        <div className="container">
          <div className="container-header">Trade</div>
          <canvas id="candle-canvas"></canvas>
        </div>

        <Trades trades={trades} onClick={(trade) => {
          getData(simSettings.simulationInterval).then(data => {
            renderTrade(trade, data, settings, simSettings, script as string);
          });
        }}/>
      </div>

      <div className="middle">
        <Scripts onChange={script => setScript(script)} />

        {result && <Monthly result={result}/>}

        {data && simSettings.symbols.every(symbol => data.some(d => d.symbol === symbol)) && <Correlations simSettings={simSettings} data={data}></Correlations>}
      </div>

      <div className="right">
        {result && <Result result={result} simSettings={result.simSettings} settings={result.settings} onClickSymbol={(symbol) => 
          getData(simSettings.simulationInterval).then(data => {
            renderSymbol(
              symbol, 
              data, 
              settings, 
              simSettings, 
              script as string
            )
          })
        }/>}
      </div>
    </>
  );
})
