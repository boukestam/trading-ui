import { Util } from "trading-lib";
import { OutputTrade, SimulationResult } from "./Simulation";
import { SimulationCandles } from "./SimulationCandles";
import { SimulationSettings } from "./SimulationSettings";

export interface AnalysisTrade extends OutputTrade {
  performance: number;
};

export interface MonteCarloResult {
  percent: number;
  drawdown: number;
  monthlyROI: number;
}

export const Analysis = {
  getBalanceAtTime: (result: SimulationResult, date: Date): number => {
    const time = date.getTime() / 1000;
    for (let i = 1; i < result.times.length; i++) {
      if (time < result.times[i]) return result.portfolioHistory[i - 1];
    }
    return result.portfolioHistory[result.portfolioHistory.length - 1];
  },

  getPerformanceTrades: (result: SimulationResult): AnalysisTrade[] => result.trades.filter(t => t.filled && t.closed).map(trade => ({
    ...trade,
    performance: (trade.profits || 0) / Analysis.getBalanceAtTime(result, trade.buyDate as Date)
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

  maxDrawdown: (trades: AnalysisTrade[]) => {
    let balance = 1;

    let top = balance;
    let maxDrawdown = 0;

    for (const trade of trades) {
      balance += balance * trade.performance;

      if (balance > top) {
        top = balance;
      } else {
        const change = Math.abs(Util.change(top, balance));

        if (change > maxDrawdown) {
          maxDrawdown = change;
        }
      }
    }

    return maxDrawdown;
  },
  averageDrawdown: (trades: AnalysisTrade[]) => {
    let balance = 1;

    let top = balance;
    let maxDrawdown = 0;

    let numDrawdowns = 0;
    let drawdown = 0;

    for (const trade of trades) {
      balance += balance * trade.performance;

      if (balance > top) {
        if (maxDrawdown > 0) {
          drawdown += maxDrawdown;
          numDrawdowns++;
        }

        maxDrawdown = 0;
        top = balance;
      } else {
        const change = Math.abs(Util.change(top, balance));

        if (change > maxDrawdown) {
          maxDrawdown = change;
        }
      }
    }

    return drawdown / numDrawdowns;
  },

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

    const startTime = result.times[0];
    const endTime = result.times[result.times.length - 1];
    const step = (endTime - startTime) / 1000;

    let tradeStart = 0;

    for (let time = startTime; time < endTime; time += step) {
      const date = new Date(time * 1000);
      let found = false;

      for (let i = tradeStart; i < trades.length; i++) {
        const trade = trades[i];

        if (date > trade.sellDate) {
          tradeStart = i + 1;
          continue;
        }

        if (date > trade.buyDate) {
          found = true;
          break;
        }
      }

      if (found) {
        inMarket++;
      } else {
        outMarket++;
      }
    }

    return inMarket / (inMarket + outMarket);
  },
  
  averageTradesInMarket: (result: SimulationResult, trades: AnalysisTrade[]) => {
    let totalTime = 0;

    for (const trade of trades) {
      totalTime += trade.sellDate.getTime() - trade.buyDate.getTime();
    }
    
    return (totalTime / 1000) / (result.times[result.times.length - 1] - result.times[0]);
  },

  roi: (trades: AnalysisTrade[], simSettings: SimulationSettings) => {
    return Analysis.netProfit(trades) / simSettings.capital;
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

      if (rois.length === 0 || month.date.getUTCFullYear() > rois[rois.length - 1].year) {
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

    // const w = Analysis.winners(trades).length / trades.length;
    // return w - ((1 - w) / (Analysis.winners(trades).length / Analysis.losers(trades).length));
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
  },

  monteCarlo: (
    result: SimulationResult, 
    trades: AnalysisTrade[], 
    runs: number, 
    simSettings: SimulationSettings
  ): MonteCarloResult[] => {
    const drawdowns: number[] = [];
    const monthlyROIs: number[] = [];

    for (let r = 0; r < runs; r++) {
      const runTrades: AnalysisTrade[] = [];

      for (let t = 0; t < trades.length; t++) {
        runTrades.push(trades[Math.floor(Math.random() * trades.length)]);
      }

      drawdowns.push(Analysis.maxDrawdown(runTrades));
      //monthlyROIs.push(Analysis.monthlyROI(result, runTrades, simSettings));
    }

    drawdowns.sort((a, b) => (b - a));
    monthlyROIs.sort((a, b) => (a - b));

    return [0.01, 0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95, 0.99].map(percent => ({
      percent: percent,
      drawdown: Util.avg(drawdowns.slice(0, Math.floor(runs * percent))),
      monthlyROI: 0//Util.avg(monthlyROIs.slice(0, Math.floor(runs * percent)))
    }));
  },

  hourOfDayExpectedValue: (trades: AnalysisTrade[]) => {
    const result = [];
    
    for (let h = 0; h < 24; h++) {
      result.push({
        hour: h,
        expectedValue: Analysis.expectedValue(trades.filter(trade => trade.buyDate.getUTCHours() === h))
      });
    }

    return result;
  },

  dayOfWeekExpectedValue: (trades: AnalysisTrade[]) => {
    const result = [];
    
    for (let d = 0; d < 7; d++) {
      result.push({
        day: d,
        expectedValue: Analysis.expectedValue(trades.filter(trade => trade.buyDate.getUTCDay() === d))
      });
    }

    return result;
  },

  covariance: (x: SimulationCandles, y: SimulationCandles): number => {
    const firstX = x.get(0);
    const firstY = y.get(0);

    let startX = 0;
    let startY = 0;

    // Align series
    while (startY < y.length && y.get(startY).time < firstX.time) {
      startY++;
    }
    while (startX < x.length && x.get(startX).time < firstY.time) {
      startX++;
    }

    if (x.get(startX).time != y.get(startY).time) throw new Error(`Can't find common start point for covariance test`);

    let xTotal = 0, yTotal = 0;
    let count = 0;

    for (let i = 0; startX + i < x.length && startY + i < y.length; i++) {
      xTotal += x.get(startX + i).close;
      yTotal += y.get(startY + i).close;
      count++;
    }

    const xMean = xTotal / count;
    const yMean = yTotal / count;

    let sum = 0;

    for (let i = 0; startX + i < x.length && startY + i < y.length; i++) {
      sum += (x.get(startX + i).close - xMean) * (y.get(startY + i).close - yMean);
    }

    return sum / count;
  },

  candlesStandardDeviation: (x: SimulationCandles): number => {
    let total = 0;

    x.forEach(candle => {
      total += candle.close;
    });

    const mean = total / x.length;

    let sum = 0;

    x.forEach(candle => {
      sum += Math.pow(candle.close - mean, 2);
    });

    return Math.sqrt(sum / (x.length - 1));
  },

  correlation: (x: SimulationCandles, y: SimulationCandles): number => {
    return Analysis.covariance(x, y) / (Analysis.candlesStandardDeviation(x) * Analysis.candlesStandardDeviation(y));
  }
};
