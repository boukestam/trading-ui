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
    balance: number;
    portfolio: number;
    time: number;
    trades: OutputTrade[];
  };
}

export interface SimulationResult {
  balance: number;
  balanceHistory: number[];
  portfolioHistory: number[];
  trades: OutputTrade[];
  priceHistory: number[];
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
  const priceHistory = [];
  const initialPrices = provider.pairs.map(pair => pair.simulationCandles.get(0).open);

  const times = [];

  const startTime = tradingStart.getTime() / 1000;
  const endTime = tradingEnd.getTime() / 1000;
  const timeRange = endTime - startTime;

  let time = startTime;
  const intervalTime = Util.intervalToMs(simSettings.simulationInterval) / 1000;

  let lastProgressPercentage = 0;

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

        const percentage = Math.floor(((time - startTime) / timeRange) * 100);
        if (percentage > lastProgressPercentage) {
          times.push(iTime);
      
          balances.push(await provider.getBalance());
          portolioSizes.push(await provider.getPortfolioSize());

          let pi = 0;
          let total = 0;

          for (const pair of provider.pairs) {
            if (pair.price) {
              total += pair.price / initialPrices[pi];
            } else {
              total += 1;
            }

            pi++;
          }

          priceHistory.push(total / provider.pairs.length);

          if (onEvent) {
            const event: StrategyProgressEvent = {
              type: 'progress',
              data: {
                percentage: percentage,
                balance: balances[balances.length - 1],
                portfolio: portolioSizes[portolioSizes.length - 1],
                time: times[times.length - 1],
                trades: await provider.getTrades()
              }
            };
            onEvent(event);
          }

          lastProgressPercentage = percentage;
        }
      }
    }

    for (const pair of provider.pairs) {
      if (pair.increasing) {
        pair.index++;

        if (!pair.active) {
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

  balances.push(await provider.getBalance());
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