import { stat } from 'fs';
import { Candles, Pair, Script, Settings, updateStrategy, Trade, Util } from 'trading-lib';
import { SimulationProvider } from "./SimulationProvider";
import { SimulationSettings } from "./SimulationSettings";

export interface OutputTrade extends Trade {
  symbol: string;
  direction: 'long' | 'short';
  filled: boolean;
  buy: number;
  buyDate: Date;
  amount: number;
  cost: number;
  stop: number;
  limit: number;
  profit?: number;
  buyOrderDate?: Date;
  buyOrderId?: string;
  closed: boolean;
  sell: number;
  sellDate: Date;
  profits?: number;
  leverage?: number;
  stopOrders?: { orderId: number; amount: number; limit: number }[],
  signal?: any;
  note?: string;
  maxProfit: number;
  minProfit: number;
}

export interface SimulationPair extends Pair {
  startDate: Date;
  endDate: Date;
  candles: Record<string, Candles>;
  simulationCandles: Candles;
  index: number;
  increasing: boolean;
}

export interface StrategyEvent {
  type: 'start' | 'progress';
  data?: any;
};

export interface StrategyProgressEvent extends StrategyEvent {
  type: 'progress';
  data: {
    percentage: number;
    balanceHistory: number[];
    portfolioHistory: number[];
    priceHistory: number[];
    times: number[];
    trades: OutputTrade[];
  };
}

export interface SimulationResult {
  balance: number;
  balanceHistory: number[];
  portfolioHistory: number[];
  priceHistory: number[];
  trades: OutputTrade[];
  times: number[];
  simulationTime: number;
  closePrices: {[symbol: string]: number};
  monthlyBalances: {date: Date; balance: number}[];
  settings: Settings;
  simSettings: SimulationSettings;
};

export async function runSimulation (
  provider: SimulationProvider, 
  script: Script,
  tradingStart: Date, 
  tradingEnd: Date, 
  settings: Settings,
  simSettings: SimulationSettings,
  onEvent: (event: StrategyEvent) => {} | undefined
): Promise<SimulationResult> {
  const start = new Date();

  if (onEvent) {
    onEvent({
      type: 'start',
      data: {
        provider,
        settings
      }
    });
  }

  const balances: number[] = [];
  const portolioSizes: number[] = [];
  const monthlyBalances = [];
  const priceHistory: number[] = [];
  const initialPrices = provider.pairs.map(pair => pair.simulationCandles.get(100).open);

  const times = [];

  const startTime = tradingStart.getTime() / 1000;
  const endTime = tradingEnd.getTime() / 1000;
  const timeRange = endTime - startTime;

  let time = startTime;
  const intervalTime = Util.intervalToMs(simSettings.simulationInterval) / 1000;

  let lastProgressPercentage = 0;
  let lastStatPercentage = 0;

  while (time <= endTime) {
    for (let i = 0; i < 4; i++) {
      const iTime = time + i * (intervalTime / 4);
      let someActive = false;

      for (const pair of provider.pairs) {
        if (pair.index >= pair.simulationCandles.length) {
          throw new Error(`Symbol ${pair.symbol} ran out of candles at ${new Date(iTime * 1000)}`);
        }

        let candle = pair.simulationCandles.get(pair.index);

        while (candle.time < time) {
          candle = pair.simulationCandles.get(++pair.index);
        }

        if (candle.time > time) {
          pair.increasing = false;
          pair.active = false;
          continue;
        }

        pair.increasing = true;
        someActive = true;

        if (i === 0) pair.price = candle.open;
        else if (i === 1) pair.price = candle.low;
        else if (i === 2) pair.price = candle.high;
        else if (i === 3) pair.price = candle.close;
      }

      if (someActive) {
        provider.setDate(new Date(iTime * 1000));
        await updateStrategy(provider, script, settings);

        const statPercentage = Math.floor(((time - startTime) / timeRange) * 10000);
        const progressPercentage = Math.floor(((time - startTime) / timeRange) * 10);

        if (statPercentage > lastStatPercentage) {
          times.push(iTime);
      
          balances.push(await provider.getAvailableBalance());
          portolioSizes.push(await provider.getPortfolioSize());

          lastStatPercentage = statPercentage;
        }

        if (progressPercentage > lastProgressPercentage) {
          let pi = 0;
          let total = 0;
          let num = 0;

          for (const pair of provider.pairs) {
            if (pair.price) {
              const v = (pair.price / initialPrices[pi]) * 100 - 100;
              total += v;
              num++;
            } else {
              //total += 100;
            }

            pi++;
          }

          priceHistory.push(100 + total);

          if (onEvent) {
            const event: StrategyProgressEvent = {
              type: 'progress',
              data: {
                percentage: progressPercentage * 10,
                balanceHistory: balances,
                portfolioHistory: portolioSizes,
                priceHistory: priceHistory,
                times: times,
                trades: await provider.getTrades()
              }
            };
            onEvent(event);
          }

          lastProgressPercentage = progressPercentage;
        }
      }
    }

    for (const pair of provider.pairs) {
      if (pair.increasing) {
        pair.index++;

        if (!pair.active) {
          console.log('Activate ' + pair.symbol + ' at ' + time + ' with price ' + pair.price);
          pair.active = true;
        }
      }
    }

    if (new Date((time + intervalTime) * 1000).getUTCMonth() !== new Date(time * 1000).getUTCMonth()) {
      monthlyBalances.push({
        date: new Date((time + intervalTime) * 1000),
        balance: await provider.getPortfolioSize()
      });
    }

    time += intervalTime;
  }

  times.push(endTime);
  balances.push(await provider.getAvailableBalance());
  portolioSizes.push(await provider.getPortfolioSize());

  const closePrices: {[symbol: string]: number} = {};

  for (const pair of provider.pairs) {
    closePrices[pair.symbol] = pair.price;
  }
  
  return {
    balance: await provider.getPortfolioSize(),
    balanceHistory: balances,
    portfolioHistory: portolioSizes,
    trades: await provider.getTrades(),
    priceHistory: priceHistory,
    times,
    simulationTime: new Date().getTime() - start.getTime(),
    closePrices,
    monthlyBalances,
    settings,
    simSettings
  };
}