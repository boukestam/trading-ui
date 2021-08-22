import { expose } from "comlink";
import {Settings, compileScript, Util, Logger } from 'trading-lib';

import { SimulationProvider } from '../services/SimulationProvider';
import { SimulationSettings } from '../services/SimulationSettings';
import { SimulationCandles } from '../services/SimulationCandles';
import { runSimulation, SimulationPair } from '../services/Simulation';

const run = async function (
  data: {
    symbol: string;
    buffer: ArrayBuffer;
  }[], 
  scriptCode: string,
  scriptOptions: Record<string, any> | null,
  simSettings: SimulationSettings, 
  settings: Settings, 
  onEvent: any | undefined,
  verbose: boolean = false
) {
  const script = compileScript(scriptCode);
  if (scriptOptions) {
    script.options = scriptOptions;
  }

  Logger.verbose = verbose;

  settings = {
    ...settings,
    ...script.options
  };

  simSettings = {
    ...simSettings,
    ...script.options
  };

  script.options = {
    ...script.options,
    ...simSettings,
    ...settings
  }

  const pairs: SimulationPair[] = data.map((p): SimulationPair => {
    const simulationCandles = new SimulationCandles(p.buffer, simSettings.dataInterval);

    return {
      symbol: p.symbol,
      interval: settings.interval,
      intervalTime: Util.intervalToMs(settings.interval),
      candles: {},
      simulationCandles: simulationCandles,
      startDate: simSettings.start, 
      endDate: simSettings.end,
      price: 0,
      active: false,
      index: 0,
      increasing: false
    };
  });

  const result = await runSimulation(
    new SimulationProvider(pairs, simSettings.capital, settings, simSettings),
    script,
    simSettings.start, 
    simSettings.end,
    settings,
    simSettings,
    onEvent
  );

  return result;
};

const exports = {
  run
};

export type SimulationWorker = typeof exports;

expose(exports);
