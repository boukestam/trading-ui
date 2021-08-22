import { Candles, Pair, Provider, Settings, Util } from "trading-lib";
import { Display } from "../services/Display";
import { SimulationPair } from "../services/Simulation";
import { SimulationProvider } from "../services/SimulationProvider";
import { axes } from "./Axes";
import { calculateBarWidth, colors, dateToString, init, Position } from "./Render";
import { roundRect } from "./RoundRect";

export const renderCandles = async (
  canvas: HTMLCanvasElement,
  dataCandles: Candles,
  startTime: number,
  endTime: number,
  positions: Position[],
  settings: Settings,
  plot: (provider: Provider, pair: Pair, plot: (value: number, type: 'line' | 'bar') => void) => Promise<void>
): Promise<void> => {
  const context = init(canvas);

  context.fillStyle = colors.background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const candles = dataCandles.transform(settings.interval);
  const renderStartTimeIndex = candles.getIndexOfTime(startTime);
  const renderEndTimeIndex = candles.getIndexOfTime(endTime);

  const startIndex = Math.max(renderStartTimeIndex - 20, 0);
  const endIndex = Math.min(renderEndTimeIndex + 20, candles.length);

  const minTime = candles.get(startIndex).time;
  const maxTime = candles.get(endIndex - 1).time;

  const pair: SimulationPair = {
    symbol: 'ABC',
    interval: settings.interval,
    intervalTime: Util.intervalToMs(settings.interval),
    active: true,
    price: 0,
    startDate: new Date(candles.get(0).time * 1000),
    endDate: new Date(candles.getOffset(0).time * 1000),
    candles: {},
    simulationCandles: candles,
    index: 0,
    increasing: true
  };

  const provider = new SimulationProvider([pair], 0, settings, {
    capital: 0,
    start: new Date(candles.get(0).time * 1000),
    end: new Date(candles.getOffset(0).time * 1000),
    dataInterval: settings.interval,
    simulationInterval: settings.interval,
    fundingFee: 0,
    slippage: 0,
    symbols: ['ABC']
  });

  axes(
    canvas,
    context,
    [minTime, maxTime],
    (minX, maxX) => {
      return candles.range(
        candles.getIndexOfTime(minX), 
        candles.getIndexOfTime(maxX)
      ).minMax() as [number, number];
    },
    dateToString,
    Display.numToString,
    false,
    async (timeToX, priceToY, _, paddingBottom) => {
      const candleWidth = calculateBarWidth(canvas.width, endIndex - startIndex);

      for (let i = startIndex; i < endIndex; i++) {
        const candle = candles.get(i);

        const x = timeToX(candle.time);
        const high = priceToY(candle.high);
        const low = priceToY(candle.low);
        const open = priceToY(candle.open);
        const close = priceToY(candle.close);

        context.fillStyle = candle.close > candle.open ? colors.green : colors.red;

        context.fillRect(
          x - (candleWidth - 1) / 2,
          Math.min(open, close),
          candleWidth,
          Math.max(1, Math.abs(open - close))
        );

        context.fillRect(
          x,
          Math.min(high, low),
          1,
          Math.abs(high - low)
        );
      }

      const plots: {
        time: number;
        value: number;
        type: 'line' | 'bar';
      }[][] = [];

      for (let i = startIndex; i < endIndex - 1; i++) {
        const points: {
          time: number;
          value: number;
          type: 'line' | 'bar';
        }[] = [];

        const time = candles.get(i).time;
        provider.setDate(new Date(time * 1000 + pair.intervalTime));

        await plot(provider, pair, (value: number, type: 'line' | 'bar') => {
          points.push({
            time,
            value,
            type
          });
        });

        plots.push(points);
      }

      context.strokeStyle = colors.line;
      context.lineWidth = 2;

      for (let j = 0; j < plots[0].length; j++) {
        if (plots[0][j].type === 'line') {
          for (let i = 1; i < plots.length; i++) {
            context.beginPath();
            context.moveTo(
              timeToX(plots[i - 1][j].time),
              priceToY(plots[i - 1][j].value)
            );
            context.lineTo(
              timeToX(plots[i][j].time),
              priceToY(plots[i][j].value)
            );
            context.stroke();
          }
        } else if (plots[0][j].type === 'bar') {
          const values = plots.map(plot => plot[j].value);

          let [minValue, maxValue] = Util.minMax(values);
          if (minValue > 0) minValue = 0;
          if (maxValue < 0) maxValue = 0;

          for (let i = 0; i < plots.length; i++) {
            const value = plots[i][j].value;

            const ratio = (value - minValue) / (maxValue - minValue);
            const zeroRatio = (0 - minValue) / (maxValue - minValue);
            const height = 50;

            if (value > 0) {
              context.fillStyle = colors.green;
              roundRect(
                context, 
                timeToX(plots[i][j].time) - (candleWidth - 1) / 2,
                canvas.height - paddingBottom - (ratio * height),
                candleWidth,
                (ratio - zeroRatio) * height,
                {tl: 3, tr: 3, br: 0, bl: 0},
                true,
                false
              );
            } else {
              context.fillStyle = colors.red;
              roundRect(
                context, 
                timeToX(plots[i][j].time) - (candleWidth - 1) / 2,
                canvas.height - paddingBottom - (zeroRatio * height),
                candleWidth,
                (zeroRatio - ratio) * height,
                {tl: 0, tr: 0, br: 3, bl: 3},
                true,
                false
              );
            }
          }
        }
      }

      for (const position of positions) {
        const xStart = timeToX(position.openTime);
        const yStart = priceToY(position.openPrice);
        const xEnd = timeToX(position.closeTime);
        const yEnd = priceToY(position.closePrice);

        const openColor = position.side === 'long' ? colors.open : colors.close;
        const closeColor = position.side === 'long' ? colors.close : colors.open;

        context.fillStyle = openColor;
        context.beginPath();
        context.moveTo(xStart, yStart);
        context.lineTo(xStart + 5, yStart + 10);
        context.lineTo(xStart - 5, yStart + 10);
        context.fill();

        context.strokeStyle = openColor;
        context.beginPath();
        context.moveTo(xStart, yStart);
        context.lineTo(xEnd, yStart);
        context.stroke();

        context.fillStyle = closeColor;
        context.beginPath();
        context.moveTo(xEnd, yEnd);
        context.lineTo(xEnd + 5, yEnd + 10);
        context.lineTo(xEnd - 5, yEnd + 10);
        context.fill();

        context.strokeStyle = closeColor;
        context.beginPath();
        context.moveTo(xStart, yEnd);
        context.lineTo(xEnd, yEnd);
        context.stroke();
      }
    }
  );
};