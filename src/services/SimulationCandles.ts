import ByteBuffer from "./ByteBuffer";
import { Candles, OHLC, Util, Cache } from 'trading-lib';

export class SimulationCandles implements Candles {
  buffer: ArrayBuffer;
  interval: string;
  intervalTime: number;
  view: DataView;
  start: number;
  end: number;
  length: number;
  cache: Cache;

  constructor(buffer: ArrayBuffer, interval: string, start: number = 0, end: number = -1, cache: Cache = {}) {
    this.buffer = buffer;
    this.interval = interval;
    this.intervalTime = Util.intervalToMs(interval) / 1000;
    this.view = new DataView(this.buffer);
    this.cache = cache;

    if (Math.floor(start) !== start) {
      throw new Error('Start must be a integer');
    }

    if (Math.floor(end) !== end) {
      throw new Error('End must be a integer');
    }

    if (buffer.byteLength % 20 !== 0) {
      throw new Error('Bytelength is not a multiple of 20');
    }

    if (start < 0) {
      start = 0;
    }

    if (end === -1 || end > buffer.byteLength / 20) {
      end = buffer.byteLength / 20;
    }

    if (end < start) {
      end = start;
    }

    this.start = start;
    this.end =  end;
    this.length = this.end - this.start;
  }

  forEach(callback: (candle: OHLC) => void): void {
    const end = this.end * 20;
    for (let i = this.start * 20; i < end; i += 20) {
      callback(
        {
          time: this.view.getInt32(i, true),
          open: this.view.getFloat32(i + 4, true),
          high: this.view.getFloat32(i + 8, true),
          low: this.view.getFloat32(i + 12, true),
          close: this.view.getFloat32(i + 16, true)
        }
      );
    }
  }

  get(index: number): OHLC {
    if (index < 0 || index >= this.length) {
      throw new Error(`Index ${index} is outside the range of candles starting at ${this.start} with length ${this.length}`);
    }

    index += this.start;

    return {
      time: this.view.getInt32(index * 20, true),
      open: this.view.getFloat32(index * 20 + 4, true),
      high: this.view.getFloat32(index * 20 + 8, true),
      low: this.view.getFloat32(index * 20 + 12, true),
      close: this.view.getFloat32(index * 20 + 16, true)
    }
  }

  getOffset (offset: number): OHLC {
    return this.get(this.length - 1 - offset);
  }

  getIndexOfTime(time: number): number {
    // // Try to calculate the index
    // const firstTime = this.view.getInt32(0, true);
    // const index = Math.floor((time - firstTime) / this.intervalTime);

    // if (
    //   index >= this.start && 
    //   index < this.length && 
    //   this.view.getInt32(index * 20, true) + this.intervalTime > time) {
    //   return index - this.start;
    // }

    // Find the index by looping
    const end = this.end * 20;
    for (let i = this.start * 20; i < end; i += 20) {
      const t = this.view.getInt32(i, true);
      const diff = time - (t + this.intervalTime);

      if (diff < 0) {
        return (i / 20) - this.start;
      }

      const away = diff / this.intervalTime;

      if (away > 10) {
        i += Math.max(0, Math.floor(away - 5)) * 20;
      }
    }

    return -1;
  }

  minMax(): number[] {
    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;

    const end = this.end * 20;
    for (let i = this.start * 20; i < end; i += 20) {
      const low = this.view.getFloat32(i + 12, true);
      const high = this.view.getFloat32(i + 8, true);

      if (low < min) min = low;
      if (high > max) max = high;
    }

    return [min, max];
  }

  range(start: number, end: number): Candles {
    return new SimulationCandles(this.buffer, this.interval, this.start + start, this.start + end, this.cache);
  }

  transform(interval: string): Candles {
    if (interval === this.interval) return this;

    const intervalTime = Util.intervalToMs(interval);

    const output: OHLC[] = [];
    let foundFirst = false;

    this.forEach(stick => {
      const date = new Date(stick.time * 1000);

      if (!foundFirst) {
        if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0) {
          foundFirst = true;
        } else {
          return;
        }
      }

      if (output.length === 0 || date.getTime() - output[output.length - 1].time * 1000 >= intervalTime) {
        output.push({
          time: stick.time,
          open: stick.open,
          close: stick.close,
          low: Number.MAX_VALUE,
          high: Number.MIN_VALUE
        });
      }

      const current = output[output.length - 1];
      current.low = Math.min(current.low, stick.low);
      current.high = Math.max(current.high, stick.high);
      current.close = stick.close;
    });

    const buffer = new ByteBuffer(output.length * 20);

    for (const candle of output) {
      buffer.writeInts([candle.time]);
      buffer.writeFloats([
        candle.open,
        candle.high,
        candle.low,
        candle.close
      ]);
    }

    return new SimulationCandles(buffer.buffer.buffer, interval);
  }
};