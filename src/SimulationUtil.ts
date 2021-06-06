import { Trade, Util } from "trading-lib";

export const SimulationUtil = {
  getMaxDrawdown: (balances: number[]) => {
    let top = balances[0];
    let maxDrawdown = 0;

    for (const balance of balances) {
      if (balance > top) {
        top = balance;
      } else if (Util.change(top, balance) < maxDrawdown) {
        maxDrawdown = Util.change(top, balance);
      }
    }

    return maxDrawdown;
  },
  getAverageDrawdown: (balances: number[]) => {
    let top = balances[0];
    let maxDrawdown = 0;

    let numDrawdowns = 0;
    let drawdown = 0;

    for (const balance of balances) {
      if (balance > top) {
        if (maxDrawdown < 0) {
          drawdown += maxDrawdown;
          numDrawdowns++;
        }

        maxDrawdown = 0;
        top = balance;
      } else if (Util.change(top, balance) < maxDrawdown) {
        maxDrawdown = Util.change(top, balance);
      }
    }

    return drawdown / numDrawdowns;
  },
  getTradeDifference: (trade: Trade, price: number): number => {
    if (!trade.buy) return 0;
    return (trade.direction === 'long' ? (price - trade.buy) : (trade.buy - price)) * trade.amount;
  },
  getTradeProfits: (trade: Trade, price: number, fee: number) => {
    const difference = SimulationUtil.getTradeDifference(trade, price);
    return (trade.cost + difference) - (trade.amount * price * fee);
  }
};
