import { expose } from "comlink";
import {Settings, compileScript, Util } from 'trading-lib';

import { SimulationProvider } from '../SimulationProvider';
import { SimulationSettings } from '../SimulationSettings';
import { SimulationCandles } from '../SimulationCandles';
import { runSimulation, SimulationPair } from '../Simulation';

const run = async function (
  data: {
    symbol: string;
    buffer: ArrayBuffer;
  }[], 
  scriptCode: string,
  scriptOptions: Record<string, any> | null,
  simSettings: SimulationSettings, 
  settings: Settings, 
  onEvent: any | undefined
) {
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

  const script = compileScript(scriptCode);
  if (scriptOptions) {
    script.options = scriptOptions;
  }

  return await runSimulation(
    new SimulationProvider(pairs, simSettings.capital, settings, simSettings),
    script,
    simSettings.start, 
    simSettings.end,
    {
      ...settings,
      ...script.options
    },
    {
      ...simSettings,
      ...script.options
    },
    onEvent
  );
};

const exports = {
  run
};

export type SimulationWorker = typeof exports;

expose(exports);
