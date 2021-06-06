import { Candles, Logger, Pair, CandleResult, Provider, Settings, Trade, Util } from 'trading-lib';
import { OutputTrade, SimulationPair } from './Simulation';
import { SimulationSettings } from './SimulationSettings';
import { SimulationUtil } from './SimulationUtil';

export class SimulationProvider implements Provider {
  pairs: SimulationPair[];
  balance: number;
  trades: Trade[];
  settings: Settings;
  simulationSettings: SimulationSettings;
  date: Date;

  constructor (pairs: SimulationPair[], startingBalance: number, settings: Settings, simulationSettings: SimulationSettings) {
    this.pairs = pairs;
    this.balance = startingBalance;
    this.trades = [];
    this.settings = settings;
    this.simulationSettings = simulationSettings;
    this.date = new Date();
  }

  setDate (date: Date): void {
    this.date = date;
  }

  getDate (): Date {
    return this.date;
  }

  async getCandles (pair: SimulationPair, interval: string): Promise<CandleResult> {
    if (!(interval in pair.candles)) {
      pair.candles[interval] = pair.simulationCandles.transform(interval);
    }

    const index = pair.candles[interval].getIndexOfTime(this.date.getTime() / 1000);
    const candles = pair.candles[interval].range(index - 500, index);
    const [min, max] = candles.minMax();

    //console.log(candles.length, new Date(candles.get(candles.length - 1).time * 1000), this.date);
  
    return {
      candles,
      min,
      max
    };
  }

  async updatePrices (): Promise<void> {
    
  }

  async order (pair: SimulationPair, direction: 'long' | 'short', limit: number | 'market', stop: number, amount: number, signal?: any): Promise<void> {
    if (
      (direction === 'long' && pair.price > limit) ||
      (direction === 'short' && pair.price < limit)
    ) {
      Logger.log('Not opening trade because order would trigger immediately');
      return;
    }

    if (amount < 0) throw new Error('Quantity less than 0');

    const limitPrice = limit === 'market' ? pair.price : limit;

    const cost = (amount * limitPrice) / this.settings.leverage;

    Logger.log(`Opening trade on ${pair.symbol} at ${limit}`);

    const trade: Trade = {
      pair,
      filled: false,
      direction,
      limit: limitPrice,
      stop,
      cost,
      amount,
      buyOrderDate: this.date,
      signal
    };

    if (this.settings.fixedProfit) {
      if (direction === 'long') {
        trade.profit = limitPrice + (limitPrice - stop) * this.settings.fixedProfit;
      } else {
        trade.profit = limitPrice - (stop - limitPrice) * this.settings.fixedProfit;
      }
    }

    if (limit === 'market') {
      trade.buy = limitPrice;
      trade.buyDate = this.date;
      trade.filled = true;

      this.balance -= trade.cost + (amount * limitPrice * this.settings.fee);
    }

    this.trades.push(trade);
  }

  async cancelOrder (order: Trade): Promise<void> {
    Logger.log(`Cancelling order for ${order.pair.symbol} on ${this.date}`);
    this.trades.splice(this.trades.indexOf(order), 1);
  }

  async closePosition (position: Trade, limitPrice?: number, note?: string): Promise<void> {
    if (position.closed) throw new Error('Position is already closed');
    
    const price = limitPrice || position.pair.price;

    position.sell = price;
    position.sellDate = this.date;

    const profits = SimulationUtil.getTradeProfits(position, price, this.settings.fee);
    position.profits = profits - position.cost;

    Logger.log(`Sell ${position.pair.symbol} position on ${this.date} at ${price} for ${profits}`);

    this.balance += profits;

    position.closed = true;

    position.note = note;
  }

  async getBalance (): Promise<number> {
    return this.balance;
  }

  async getAvailableBalance (): Promise<number> {
    return (await this.getPortfolioSize()) - Util.sum((await this.getPositions()).filter(p => !p.filled).map(position => position.cost));
  }

  async getPortfolioSize (): Promise<number> {
    let size = this.balance;

    for (const trade of this.trades) {
      if (!trade.closed && trade.filled) size += SimulationUtil.getTradeProfits(trade, trade.pair.price, this.settings.fee);
    }

    return size;
  }

  async getPositions (): Promise<Trade[]> {
    const result = [];

    for (const trade of this.trades) {
      if (!trade.closed) result.push(trade);
    }

    return result;
  }

  async getTrades (): Promise<OutputTrade[]> {
    const output: OutputTrade[] = [];
    for (const trade of this.trades) {
      const outputTrade: Record<string, any> = {};
      for (const key in trade) {
        if (key !== 'pair') outputTrade[key] = (trade as Record<string, any>)[key];
      }
      outputTrade.symbol = trade.pair.symbol;
      output.push(outputTrade as OutputTrade);
    }
    return output;
  }

  async moveStop (position: Trade, stop: number): Promise<void> {
    if (
      (position.direction === 'long' && stop > position.pair.price) ||
      (position.direction === 'short' && stop < position.pair.price)
    ) {
      throw new Error('Stop loss is above price');
    }

    Logger.log(`Setting stop loss for ${position.pair.symbol} to ${stop} on ${this.date}`);
    position.stop = stop;
  }

  async update (): Promise<void> {
    if (await this.getPortfolioSize() <= 0) throw new Error(`Account is liquidated on ${this.date}`);

    const positions = await this.getPositions();

    // Funding fees
    if (
      this.date.getUTCHours() % 8 === 0 && 
      this.date.getUTCMinutes() === 0 && 
      this.date.getUTCSeconds() === 0
    ) {
      for (const position of positions.filter(p => p.filled)) {
        this.balance -= (position.amount * position.pair.price) * this.simulationSettings.fundingFee;
      }
    }

    for (const order of positions) {
      if (order.filled) continue;

      const price = order.pair.price;

      if (
        (order.direction === 'long' && price >= order.limit) || 
        (order.direction === 'short' && price <= order.limit)
      ) {
        order.buy = price;
        order.buyDate = this.date;

        this.balance -= order.cost + (order.amount * order.limit * this.settings.fee);

        const existingPosition = positions.filter(p => p.filled).find(position => position.pair === order.pair && position.direction === order.direction);
        if (existingPosition) {
          const totalAmount = existingPosition.amount + order.amount;
          const existingRatio = existingPosition.amount / totalAmount;
          const orderRatio = order.amount / totalAmount;

          existingPosition.buy = ((existingPosition.buy || 0) * existingRatio) + (order.buy * orderRatio);
          existingPosition.stop = (existingPosition.stop * existingRatio) + (order.stop * orderRatio);
          existingPosition.cost += order.cost;
          existingPosition.amount = totalAmount;

          this.trades.splice(this.trades.indexOf(order), 1);
        } else {
          order.filled = true;
        }

        Logger.log(`Buy ${order.pair.symbol} position on ${this.date} at ${price} for ${order.cost}`);
      } else if (
        (order.direction === 'long' && price <= order.stop) || 
        (order.direction === 'short' && price >= order.stop)
      ) {
        await this.cancelOrder(order);
      }
    }

    for (const position of positions) {
      if (!position.filled) continue;

      const price = position.pair.price;

      if (
        (position.direction === 'long' && (price <= position.stop || (position.profit && price >= position.profit))) || 
        (position.direction === 'short' && (price >= position.stop || (position.profit && price <= position.profit)))
      ) {
        await this.closePosition(position, position.stop, 'Stop loss');
      } else {
        const profits = SimulationUtil.getTradeProfits(position, price, this.settings.fee);
        position.profits = profits - position.cost;
      }
    }
  }
}