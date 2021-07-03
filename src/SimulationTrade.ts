import { Trade } from "trading-lib";

export interface SimulationTrade extends Trade {
    maxProfit: number;
    minProfit: number;
}