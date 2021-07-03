import { Candles, Pair, Provider, Settings, Util } from 'trading-lib';
import { SimulationPair } from './Simulation';
import { SimulationProvider } from './SimulationProvider';

export interface Position {
  side: 'long' | 'short',
  openTime: number,
  closeTime: number,
  openPrice: number,
  closePrice: number
}

const colors = {
  background: '#ffffff',
  marker: '#cccccc',
  border: '#cccccc',
  label: '#222222',
  green: '#26A69A',
  red: '#EF5350',
  open: '#087f23',
  close: '#ba000d'
};

const shortDayNames = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];

const shortMonthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

const padZeros = (num: number, length: number): string => {
  let s = num.toString();
  while (s.length < length) s = '0' + s;
  return s;
};

export const dateToString = (time: number, timeInterval: number): string => {
  const date = new Date(time * 1000);

  if (timeInterval > 3600 * 24) {
    return `${date.getUTCDate()} ${shortMonthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  } else {
    return `${shortDayNames[date.getUTCDay()]} ${padZeros(date.getUTCHours(), 2)}:${padZeros(date.getUTCMinutes(), 2)}`;
  }
}

function hexToRgb(hex: string) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error('Invalid hex color in line graph');

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

function calculateBarWidth (canvasWidth: number, count: number): number {
  let barWidth = (canvasWidth / count) * 0.5;
  for (let i = 1; i < canvasWidth; i += 2) {
    if (barWidth < i) {
      barWidth = i;
      break;
    }
  }
  return barWidth
}

const init = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  canvas.width = canvas.getBoundingClientRect().width;
  canvas.height = canvas.getBoundingClientRect().height;
  return canvas.getContext('2d') as CanvasRenderingContext2D;
};

const axes = (
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  xFormat: (x: number, interval: number) => string,
  yFormat: (y: number, interval: number) => string,
  log: boolean = false
): [(x: number) => number, (y: number) => number, number, number] => {
  const paddingRight = 60;
  const paddingBottom = 25;

  let xRange = maxX - minX;
  maxX += xRange * 0.1;
  xRange = maxX - minX;

  if (log) {
    maxY = Math.log(Math.max(maxY, 0) + 1);
    minY = Math.log(Math.max(minY, 0) + 1);
  }

  let yRange = maxY - minY;
  minY -= yRange * 0.1;
  maxY += yRange * 0.1;
  yRange = maxY - minY;

  const xToCanvas = (x: number): number => Math.round((x - minX) / xRange * (canvas.width - paddingRight));
  const yToCanvas = (y: number): number => Math.round((canvas.height - paddingBottom) - ((log ? Math.log(Math.max(y, 0) + 1) : y) - minY) / yRange * (canvas.height - paddingBottom));

  context.fillStyle = colors.background
  context.fillRect(canvas.width - paddingRight, 0, paddingRight, canvas.height);

  context.fillStyle = colors.border;
  context.fillRect(canvas.width - paddingRight, 0, 1, canvas.height);

  context.fillStyle = colors.background;
  context.fillRect(0, canvas.height - paddingBottom, canvas.width, paddingBottom);

  context.fillStyle = colors.border;
  context.fillRect(0, canvas.height - paddingBottom, canvas.width, 1);

  if (log) {
    let prevY = 0;
    for (let i = -1; i < 10; i++) {
      for (let j = 0; j < 9; j++) {
        const value = Math.pow(10, i) + Math.pow(10, i) * j;
        const y = yToCanvas(value);

        if (prevY && Math.abs(y - prevY) < 20) {
          continue;
        }
        prevY = y;

        if (y < 0 || y >= canvas.height - paddingBottom) continue;

        context.fillStyle = colors.marker;
        context.fillRect(0, y, canvas.width - paddingRight + 5, 1);

        context.fillStyle = colors.label;
        context.font = '10px Roboto';
        context.fillText(yFormat(value, 0), canvas.width - 50, y + 3);
      }
    }
  } else {
    let yInterval = 1;
    while (true) {
      const size = Math.abs(yToCanvas(yInterval * 2) - yToCanvas(yInterval));

      if (size < 25) {
        yInterval *= 1.1;
      } else if (size > 45) {
        yInterval *= 0.9;
      } else {
        break;
      }
    }

    for (let l = Math.ceil(minY / yInterval) * yInterval; l <= maxY; l += yInterval) {
      const y = yToCanvas(l);

      context.fillStyle = colors.marker;
      context.fillRect(0, y, canvas.width - paddingRight + 5, 1);

      context.fillStyle = colors.label;
      context.font = '10px Roboto';
      context.fillText(yFormat(l, yInterval), canvas.width - 50, y + 3);
    }
  }

  let xInterval = 1;
  while (true) {
    const size = Math.abs(xToCanvas(xInterval * 2) - xToCanvas(xInterval));

    if (size < 80) {
      xInterval *= 1.1;
    } else if (size > 150) {
      xInterval *= 0.9;
    } else {
      break;
    }
  }

  for (let l = Math.floor(minX / xInterval) * xInterval; l <= maxX; l += xInterval) {
    const x = xToCanvas(l);

    context.fillStyle = colors.marker;
    context.fillRect(x, 0, 1, canvas.height - paddingBottom + 5);

    context.fillStyle = colors.label;
    context.font = '10px Roboto Condensed';

    const text = xFormat(l, xInterval);
    const textSize = context.measureText(text);
    context.fillText(text, x - textSize.width / 2, canvas.height - 8);
  }

  return [xToCanvas, yToCanvas, paddingRight, paddingBottom];
}

export const render = async (
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
  const [minPrice, maxPrice] = candles.range(startIndex, endIndex).minMax();

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

  const [timeToX, priceToY, , paddingBottom] = axes(
    canvas,
    context,
    minTime,
    maxTime,
    minPrice,
    maxPrice,
    dateToString,
    Util.numberToString
  );

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

  context.strokeStyle = "#007ac1";
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
          context.fillStyle = '#4CAF50';
          context.fillRect(
            timeToX(plots[i][j].time) - (candleWidth - 1) / 2,
            canvas.height - paddingBottom - (ratio * height),
            candleWidth,
            (ratio - zeroRatio) * height
          );
        } else {
          context.fillStyle = '#FF5252';
          context.fillRect(
            timeToX(plots[i][j].time) - (candleWidth - 1) / 2,
            canvas.height - paddingBottom - (zeroRatio * height),
            candleWidth,
            (zeroRatio - ratio) * height
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
};

export const renderLines = (
  canvas: HTMLCanvasElement, 
  x: number[], 
  series: number[][], 
  seriesColors: string[],
  xFormat: (x: number, interval: number) => string,
  yFormat: (y: number, interval: number) => string,
  log: boolean = false
): void => {
  const context = init(canvas);

  context.fillStyle = colors.background;
  context.lineWidth = 3;
  context.lineCap = 'round';
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (x.length === 0) return;

  let minY = Number.MAX_VALUE;
  let maxY = -Number.MAX_VALUE;
  for (const y of series) {
    const [seriesMinY, seriesMaxY] = Util.minMax(y);
    if (seriesMinY < minY) minY = seriesMinY;
    if (seriesMaxY > maxY) maxY = seriesMaxY;
  }

  const [xToCanvas, yToCanvas, , paddingBottom] = axes(
    canvas,
    context,
    x[0],
    x[x.length - 1],
    minY,
    maxY,
    xFormat,
    yFormat,
    log
  );

  for (let s = 0; s < series.length; s++) {
    const y = series[s];
    if (y.length === 0 || x.length === 0) continue;

    context.strokeStyle = seriesColors[s];
    context.fillStyle = `rgba(${Object.values(hexToRgb(seriesColors[s])).join(',')}, 0.5)`;

    context.beginPath();
    context.moveTo(xToCanvas(x[0]), yToCanvas(y[0]));

    for (let i = 1; i < x.length; i++) {
      context.lineTo(xToCanvas(x[i]), yToCanvas(y[i]));
    }

    context.stroke();

    context.lineTo(xToCanvas(x[x.length - 1]), canvas.height - paddingBottom);
    context.lineTo(xToCanvas(x[0]), canvas.height - paddingBottom);
    context.fill();

    context.closePath();
  }
};

export const renderBars = (
  canvas: HTMLCanvasElement, 
  x: number[], 
  y: number[], 
  xFormat: (x: number, interval: number) => string,
  yFormat: (y: number, interval: number) => string,
  log: boolean = false
): void => {
  const context = init(canvas);

  context.fillStyle = colors.background;
  context.lineWidth = 3;
  context.lineCap = 'round';
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (x.length === 0) return;

  let [minY, maxY] = Util.minMax(y);
  if (minY > 0) minY = 0;
  if (maxY < 0) maxY = 0;

  const [xToCanvas, yToCanvas, , ] = axes(
    canvas,
    context,
    x[0],
    x[x.length - 1],
    minY,
    maxY,
    xFormat,
    yFormat,
    log
  );

  const barWidth = calculateBarWidth(canvas.width, x.length);

  for (let i = 0; i < x.length; i++) {
    const canvasZero = yToCanvas(0);
    const canvasY = yToCanvas(y[i]);

    if (canvasY < canvasZero) {
      context.fillStyle = '#4CAF50';
      context.fillRect(
        xToCanvas(x[i]) - (barWidth - 1) / 2,
        canvasY,
        barWidth,
        canvasZero - canvasY
      );
    } else {
      context.fillStyle = '#FF5252';
      context.fillRect(
        xToCanvas(x[i]) - (barWidth - 1) / 2,
        canvasZero,
        barWidth,
        canvasY - canvasZero
      );
    }
  }
};