import React, {useEffect, useState} from 'react';
import axios from 'axios';
import { proxy, wrap, releaseProxy } from 'comlink';

import './App.css';

import { Util, Candles, Settings, Trade, Pair, compileScript } from 'trading-lib';

import { SimulationCandles } from './SimulationCandles';
import { StrategyEvent, StrategyProgressEvent, OutputTrade, SimulationResult } from './Simulation';
import { SimulationSettings } from './SimulationSettings';
import { render, renderSeries } from './Render';

import { Result } from './Result';
import { SimulationUtil } from './SimulationUtil';
import { getScript, Scripts } from './Scripts';
import { Trades } from './Trades';
import { Analysis } from './Analysis';
import { Display } from './Display';

interface Mode {
  capital: number;
  start: Date;
  end: Date;
  fee: number;
  fundingFee: number;
  leverage: number;
  interval: string;
  dataInterval: string;
  simulationInterval: string;
  getFileName: (symbol: string) => string;
  symbols: string[];
  minBalance: number;
  maxCost: number;
  risk: number;
};

const forexMode: Mode = {
  capital: 100,
  start: new Date(Date.UTC(2018, 0, 1)),
  end: new Date(Date.UTC(2018, 11, 20, 11)),
  fee: 0.00015,
  fundingFee: 0.00005479452,
  leverage: 100,
  interval: '1h',
  dataInterval: '1h',
  simulationInterval: '1h',
  minBalance: 0.5,
  maxCost: 0.1,
  risk: 0.01,
  getFileName: (symbol: string) => `/data/fx/${symbol.toLowerCase()}/DAT_ASCII_${symbol}_M1_2018.bin`,
  symbols: ['EURUSD', 'USDJPY', 'GBPUSD', 'USDCAD', 'AUDUSD', 'EURGBP', 'USDCHF', 'NZDCHF', 'USDHKD']
  //['EURUSD','EURCHF','EURGBP','EURJPY','EURAUD','USDCAD','USDCHF','USDJPY','USDMXN','GBPCHF','GBPJPY','GBPUSD','AUDJPY','AUDUSD','CHFJPY','NZDJPY','NZDUSD','XAUUSD','EURCAD','AUDCAD','CADJPY','EURNZD','GRXEUR','NZDCAD','SGDJPY','USDHKD','USDNOK','USDTRY','XAUAUD','AUDCHF','AUXAUD','EURHUF','EURPLN','FRXEUR','HKXHKD','NZDCHF','SPXUSD','USDHUF','USDPLN','USDZAR','XAUCHF','ZARJPY','BCOUSD','ETXEUR','EURCZK','EURSEK','GBPAUD','GBPNZD','JPXJPY','UDXUSD','USDCZK','USDSEK','WTIUSD','XAUEUR','AUDNZD','CADCHF','EURDKK','EURNOK','EURTRY','GBPCAD','NSXUSD','UKXGBP','USDDKK','USDSGD','XAGUSD','XAUGBP']
};

const altMode: Mode = {
  capital: 100,
  start: new Date(Date.UTC(2020, 0, 1)),
  end: new Date(Date.UTC(2021, 5, 1, 20)),
  fee: 0.0004,
  fundingFee: 0.0001,
  leverage: 10,
  interval: '1h',
  dataInterval: '1h',
  simulationInterval: '1h',
  minBalance: 0.5,
  maxCost: 0.1,
  risk: 0.03,
  getFileName: (symbol: string) => `/data/cache/${symbol}-1h-futures-data.bin`,
  symbols: [
    'BTCUSDT',
    'ETHUSDT',
    'ADAUSDT',
    'BNBUSDT',
    'VETUSDT',
    'TRXUSDT',
    'AVAXUSDT',
    'FILUSDT',
    'LINKUSDT',
    'ETCUSDT'
  ]
};

const spotMode: Mode = {
  ...altMode,
  start: new Date(Date.UTC(2017, 8, 1)),
  end: new Date(Date.UTC(2021, 5, 1)),
  getFileName: (symbol: string) => `/data/cache/${symbol}-1h-spot-data.bin`,
  fee: 0.002,
  fundingFee: 0,
  leverage: 1,
  minBalance: 0.1,
  maxCost: 0.25,
  risk: 0.02,
};

const btcMode: Mode = {
  ...spotMode,
  start: new Date(Date.UTC(2017, 8, 1)),
  end: new Date(Date.UTC(2021, 5, 1)),
  symbols: [
    // 'ETHBTC',
    // 'ADABTC',
    // 'BNBBTC',
    // 'UNIBTC',
    // 'VETBTC',
    // 'AVAXBTC',
    // 'TRXBTC',
    // 'LINKBTC'
    'ETHBTC', 
    'BNBBTC', 
    'ADABTC',
    'MATICBTC', 
    'XRPBTC', 
    'VETBTC',
    'LINKBTC',
    'ETCBTC', 
    'XVGBTC', 
    'EOSBTC',
    'XLMBTC',
    'UNIBTC',
    'TRXBTC',
  ]
};

const historyMode: Mode = {
  ...altMode,
  start: new Date(Date.UTC(2017, 8, 1)),
  end: new Date(Date.UTC(2021, 4, 20)),
  getFileName: (symbol: string) => `/data/Binance_${symbol}_1h.bin`,
  symbols: ['BTCUSDT', 'ETHUSDT']
};

const verifyMode: Mode = {
  ...altMode,
  capital: 3442,
  start: new Date(Date.UTC(2021, 5, 1, 6, 40)),
  end: new Date(Date.UTC(2021, 5, 5, 20, 15)),
  interval: '1h',
  dataInterval: '1m',
  simulationInterval: '1m',
  getFileName: (symbol: string) => `/data/cache/${symbol}-1m-futures-data.bin`,
  symbols: [
    'BTCUSDT',
    'ETHUSDT',
    'ADAUSDT',
    'UNIUSDT',
    'BNBUSDT',
    'VETUSDT',
    'TRXUSDT',
    'AVAXUSDT',
    'FILUSDT',
    'LINKUSDT',
    'ETCUSDT'
  ]
};

const modes: {[key: string]: Mode} = {
  forex: forexMode,
  alts: altMode,
  history: historyMode,
  verify: verifyMode,
  spot: spotMode,
  btc: btcMode
};

const settings = (mode: Mode): Settings => ({
  interval: mode.interval,
  fee: mode.fee,
  leverage: mode.leverage,
  maxCost: mode.maxCost,
  minBalance: mode.minBalance,
  maxCandlesToBuy: 1,
  risk: mode.risk,
  fixedProfit: 0,
  maxPositions: 6,
  directions: ['long', 'short']
});

const simSettings = (mode: Mode): SimulationSettings => ({
  capital: mode.capital,
  start: mode.start,
  end: mode.end,
  dataInterval: mode.dataInterval,
  simulationInterval: mode.simulationInterval,
  fundingFee: mode.fundingFee,
  symbols: mode.symbols
});

interface Data {
  symbol: string;
  buffer: ArrayBuffer;
}

async function load (mode: Mode, symbol: string, simulationInterval: string): Promise<Data> {
  // 
  const response = await axios.get(mode.getFileName(symbol), {
    responseType: 'arraybuffer'
  });

  const buffer = response.data as ArrayBuffer;
  const candles = new SimulationCandles(buffer, simSettings(mode).dataInterval);
  const simulationBuffer = (candles.transform(simulationInterval) as SimulationCandles).buffer;

  return {
    symbol: symbol,
    buffer: simulationBuffer
  };
}

interface State {
  balanceHistory: number[][]
  portfolioHistory: number[][]
}

const state: State = {
  balanceHistory: [[], []],
  portfolioHistory: [[], []]
};

async function runSimulation (
  mode: Mode, 
  data: Data[], 
  script: string, 
  scriptOptions: Record<string, any> | null, 
  callback?: (event: StrategyEvent) => void
) {
  const worker = new Worker("./SimulationWorker", {
    name: "simulation-worker",
    type: "module"
  });
  const workerApi = wrap<import("./SimulationWorker").SimulationWorker>(worker);

  const result = await workerApi.run(
    data, 
    script, 
    scriptOptions, 
    simSettings(mode), 
    settings(mode), 
    callback && proxy(callback)
  );

  workerApi[releaseProxy]();
  worker.terminate();

  return result;
}

function App() {
  const [progress, setProgress] = useState<number>(0);
  const [trades, setTrades] = useState<OutputTrade[]>([]);
  const [data, setData] = useState<Data[] | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [script, setScript] = useState<string | null>(null);
  const [mode, setMode] = useState<string>('alts');

  useEffect(() => {
    const doneTrades = trades.filter(trade => trade.closed);
    if (doneTrades.length > 0) {
      renderTrade(doneTrades[doneTrades.length - 1]);
    }
  }, [trades])

  const getData = async (simulationInterval: string) => {
    let loadedData;

    if (!data) {
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

    const result = await runSimulation(modes[mode], await getData(simSettings(modes[mode]).simulationInterval), getScript(script), null, (event: StrategyEvent) => {
      if (event.type === 'progress') {
        const progressEvent = event as StrategyProgressEvent;
        
        state.balanceHistory[0].push(progressEvent.data.time);
        state.balanceHistory[1].push(progressEvent.data.balance);
        
        state.portfolioHistory[0].push(progressEvent.data.time);
        state.portfolioHistory[1].push(progressEvent.data.portfolio);
  
        renderSeries(
          document.getElementById('balance-canvas') as HTMLCanvasElement,
          state.balanceHistory[0],
          [
            state.balanceHistory[1], 
            state.portfolioHistory[1]
          ],
          [
            '#ff6f00',
            '#5466fd'
          ]
        );
  
        setTrades(event.data.trades);
  
        setProgress(progressEvent.data.percentage);
      } else {
        console.log(event);
      }
    });

    console.log(result);
    console.log(result.trades.filter(t => t.filled && !t.closed));

    setResult(result);
  };

  const optimize = async () => {
    if (!script) return;

    const source = getScript(script);
    const compiled = compileScript(source);
    const data = await getData(simSettings(modes[mode]).simulationInterval);

    for (const key in compiled.optimize) {
      const settings = compiled.optimize[key];
      let bestDrawdown = -Number.MAX_VALUE;
      let bestValue = -1;

      const initialValue = compiled.options[key];

      for (let value = settings.min; value <= settings.max; value += settings.step) {
        compiled.options[key] = value;
        const result = await runSimulation(modes[mode], data, source, compiled.options);

        const maxDrawdown = SimulationUtil.getMaxDrawdown(result.portfolioHistory);
        const sharpeRatio = Analysis.sharpeRatio(
          Analysis.getPerformanceTrades(result),
          simSettings(modes[mode])
        );

        console.log(`${key} = ${value} drawdown = ${Display.percentage(maxDrawdown)} balance = ${Display.number(result.balance)} sharpeRatio = ${Display.percentage(sharpeRatio)} trades = ${Display.number(result.trades.length)}`);

        if (sharpeRatio > bestDrawdown) {
          bestDrawdown = sharpeRatio;
          bestValue = value;
        }
      }

      compiled.options[key] = initialValue;

      console.log(`Best ${key} = ${bestValue}`);
    }
  }

  const renderTrade = (trade: OutputTrade) => {
    if (!data) return;

    const tradeData = data.find(d => d.symbol === trade.symbol);
    if (!tradeData) return;

    let candles: Candles = new SimulationCandles(tradeData.buffer, simSettings(modes[mode]).dataInterval);

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
      settings(modes[mode])
    );
  }

  return (
    <div className="App">
      <div className="left">
        <Scripts onChange={script => setScript(script)} />
        <canvas id="balance-canvas" className="container"></canvas>
      </div>

      <div className="middle">
        <canvas id="candle-canvas" className="container"></canvas>
        <Trades trades={trades} onClick={(trade) => renderTrade(trade)}/>
      </div>

      <div className="right">
        <div className="controls container">
          <div className="control-buttons">
            <button onClick={run}>Run</button>
            <button onClick={optimize}>Optimize</button>
          </div>

          <div className="progress">
            <div className="progress-bar" style={{width: progress === 0 ? 0 : 'calc(' + progress + '% + 2px)'}}></div>
            <div className={`progress-text ${progress > 50 && 'progress-text-covered'}`}>{progress}%</div>
          </div>

          <div>
            <select value={mode} onChange={e => {
              setMode(e.target.value);
              setData(null);
            }}>
              <option value="alts">Alts</option>
              <option value="forex">Forex</option>
              <option value="history">History</option>
              <option value="verify">Verify</option>
              <option value="spot">Spot</option>
              <option value="btc">BTC</option>
            </select>
          </div>
        </div>

        <div className="trades container">
          {result && <Result result={result} simSettings={simSettings(modes[mode])} settings={settings(modes[mode])}/>}
        </div>
      </div>
    </div>
  );
}

export default App;
