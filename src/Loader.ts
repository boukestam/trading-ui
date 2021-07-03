import axios from "axios";
import { Mode, simSettings } from "./Modes";
import { SimulationCandles } from "./SimulationCandles";

export interface Data {
  symbol: string;
  buffer: ArrayBuffer;
}

export async function load (mode: Mode, symbol: string, simulationInterval: string): Promise<Data> {
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