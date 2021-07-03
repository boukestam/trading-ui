import { Trade } from "trading-lib";

export const SimulationUtil = {
  getTradeDifference: (trade: Trade, price: number): number => {
    if (!trade.buy) return 0;
    return (trade.direction === 'long' ? (price - trade.buy) : (trade.buy - price)) * trade.amount;
  },
  getTradeProfits: (trade: Trade, price: number, fee: number) => {
    const difference = SimulationUtil.getTradeDifference(trade, price);
    return trade.cost + difference;
  }
};
