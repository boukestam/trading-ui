export interface SimulationSettings {
  capital: number;
  start: Date;
  end: Date;
  dataInterval: string;
  simulationInterval: string;
  fundingFee: number;
  slippage: number;
  symbols: string[];
}