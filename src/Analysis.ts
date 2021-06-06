import { Util } from "trading-lib";
import { OutputTrade, SimulationResult } from "./Simulation";
import { SimulationSettings } from "./SimulationSettings";
import { SimulationUtil } from "./SimulationUtil";

export interface AnalysisTrade extends OutputTrade {
  performance: number;
};

export const Analysis = {
  getBalanceAtTime: (result: SimulationResult, date: Date): number => {
    const time = date.getTime() / 1000;
    for (let i = 1; i < result.times.length; i++) {
      if (time < result.times[i]) return result.portfolioHistory[i - 1];
    }
    throw new Error('No balance found for time ' + date);
  },

  getPerformanceTrades: (result: SimulationResult): AnalysisTrade[] => result.trades.filter(t => t.filled && t.closed).map(trade => ({
    ...trade,
    performance: (trade.profits || 0) / Analysis.getBalanceAtTime(result, trade.buyOrderDate as Date)
  })),

  winners: (trades: AnalysisTrade[]) => trades.filter(t => t.performance > 0),
  losers: (trades: AnalysisTrade[]) => trades.filter(t => t.performance < 0),

  averageDuration: (trades: AnalysisTrade[]) => Util.durationToString(
    Util.avg(
      trades.map(trade => 
        trade.sellDate.getTime() - trade.buyDate.getTime()
      )
    )
  ),

  longs: (trades: AnalysisTrade[]) => trades.filter(t => t.direction === 'long'),
  shorts: (trades: AnalysisTrade[]) => trades.filter(t => t.direction === 'short'),

  maxDrawdown: (result: SimulationResult) => SimulationUtil.getMaxDrawdown(result.portfolioHistory),
  averageDrawdown: (result: SimulationResult) => SimulationUtil.getAverageDrawdown(result.portfolioHistory),

  averageLoss: (trades: AnalysisTrade[]) => Math.abs(Analysis.expectedValue(Analysis.losers(trades))),

  expectedValue: (trades: AnalysisTrade[]) => Util.avg(trades.map(t => t.performance)),
  expectation: (trades: AnalysisTrade[]) => Analysis.expectedValue(trades) / Analysis.averageLoss(trades),

  biggestWinner: (trades: AnalysisTrade[]) => {
    return trades.map(t => t.performance).reduce((a, v) => Math.max(a, v), 0);
  },
  biggestLoser: (trades: AnalysisTrade[]) => {
    return trades.map(t => t.performance).reduce((a, v) => Math.min(a, v), 0);
  },

  getStreak: (trades: AnalysisTrade[], f: (n: number) => boolean) => {
    let streak = 0;
    let maxStreak = 0;
    for (const trade of trades) {
      if (f(trade.performance)) {
        streak++;
        if (streak > maxStreak) maxStreak = streak;
      } else {
        streak = 0;
      }
    }
    return maxStreak;
  },

  winningStreak: (trades: AnalysisTrade[]) => Analysis.getStreak(trades, n => n > 0),
  losingStreak: (trades: AnalysisTrade[]) => Analysis.getStreak(trades, n => n < 0),

  netProfit: (trades: AnalysisTrade[]) => trades.reduce((a, v) => a + (v.profits || 0), 0),
  grossProfit: (trades: AnalysisTrade[]) => Analysis.winners(trades).reduce((a, v) => a + (v.profits || 0), 0),
  grossLoss: (trades: AnalysisTrade[]) => Analysis.losers(trades).reduce((a, v) => a + (v.profits || 0), 0),

  ratioTimeInMarket: (result: SimulationResult, trades: AnalysisTrade[]) => {
    let inMarket = 0, outMarket = 0;

    for (let time = result.times[0]; time < result.times[result.times.length - 1]; time += 3600 * 24) {
      const date = new Date(time * 1000);
      if (trades.some(trade => date > trade.buyDate && date < trade.sellDate)) {
        inMarket++;
      } else {
        outMarket++;
      }
    }

    return inMarket / (inMarket + outMarket);
  },
  
  averageTradesInMarket: (result: SimulationResult, trades: AnalysisTrade[]) => {
    let total = 0;
    let num = 0;

    for (let time = result.times[0]; time < result.times[result.times.length - 1]; time += 3600 * 24) {
      const date = new Date(time * 1000);
      total += trades.filter(trade => date > trade.buyDate && date < trade.sellDate).length;
      num++;
    }

    return total / num;
  },

  roi: (trades: AnalysisTrade[], simSettings: SimulationSettings) => {
    return (simSettings.capital + Analysis.netProfit(trades)) / simSettings.capital;
  },

  expectedValueOnMargin: (trades: AnalysisTrade[]) => {
    return Analysis.expectedValue(trades) - Analysis.standardError(trades);
  },

  years: (result: SimulationResult) => {
    return (result.times[result.times.length - 1] - result.times[0]) / (3600 * 24 * 365);
  },

  annualROI: (result: SimulationResult, trades: AnalysisTrade[], simSettings: SimulationSettings) => {
    return Math.pow(Analysis.roi(trades, simSettings), 1 / Analysis.years(result));
  },
  monthlyROI: (result: SimulationResult, trades: AnalysisTrade[], simSettings: SimulationSettings) => {
    return Math.pow(Analysis.roi(trades, simSettings), 1 / (Analysis.years(result) * 12));
  },

  monthlyROIS: (result: SimulationResult) => {
    const rois: {
      year: number;
      months: {
        month: number;
        roi: number;
      }[]
    }[] = [];

    for (let i = 0; i < result.monthlyBalances.length; i++) {
      const month = result.monthlyBalances[i];

      if (rois.length == 0 || month.date.getUTCFullYear() > rois[rois.length - 1].year) {
        rois.push({
          year: month.date.getUTCFullYear(),
          months: []
        });
      }

      const change = Util.change(
        month.balance, 
        i + 1 < result.monthlyBalances.length ? result.monthlyBalances[i + 1].balance : result.balance
      );

      rois[rois.length - 1].months.push({
        month: month.date.getUTCMonth(),
        roi: change
      });
    }

    return rois;
  },

  standardDeviation: (trades: AnalysisTrade[]): number => {
    const mean = Analysis.expectedValue(trades);
    return Math.sqrt(
      trades.reduce((a, t) => a + Math.pow(t.performance - mean, 2), 0) / trades.length
    );
  },

  standardError: (trades: AnalysisTrade[]): number => {
    return Analysis.standardDeviation(trades) / Math.sqrt(trades.length);
  },

  kellyRisk: (trades: AnalysisTrade[]): number => {
    return (
      (Analysis.winners(trades).length / (trades.length))
      -
      (Analysis.losers(trades).length / (trades.length))
    )
    /
    (
      Analysis.expectedValue(Analysis.winners(trades))
      /
      Analysis.expectedValue(Analysis.losers(trades))
    );
  },

  sharpeRatio: (trades: AnalysisTrade[], simSettings: SimulationSettings): number => {
    return Analysis.roi(trades, simSettings) / Analysis.standardDeviation(trades);
  },

  divergence: (result: SimulationResult): number => {
    const balances = result.portfolioHistory;

    const startBalance = Math.log(balances[0]);
    const endBalance = Math.log(balances[balances.length - 1]);
    const deltaBalance = (endBalance - startBalance) / balances.length;
    let totalDivergence = 0;

    for (let i = 0; i < balances.length; i++) {
      const mean = startBalance + i * deltaBalance;
      const logBalance = Math.log(balances[i]);

      const divergence = (
        mean === 0 || 
        logBalance === 0 || 
        mean - logBalance === 0 || 
        logBalance - mean === 0
      ) ? 0 : Math.abs(Util.change(logBalance, mean));
      totalDivergence += divergence;
    }

    return totalDivergence / balances.length;
  }
};
