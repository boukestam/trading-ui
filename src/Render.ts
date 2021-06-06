import { Candles, Library, Settings, Util } from 'trading-lib';

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

const init = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
    canvas.width = canvas.getBoundingClientRect().width;
    canvas.height = canvas.getBoundingClientRect().height;
    return canvas.getContext('2d') as CanvasRenderingContext2D;
};

const axes = (
    canvas: HTMLCanvasElement, 
    context: CanvasRenderingContext2D, 
    minTime: number, 
    maxTime: number, 
    minPrice: number, 
    maxPrice: number,
    log: boolean = false
): [(time: number) => number, (price: number) => number, number, number] => {
    const paddingRight = 60;
    const paddingBottom = 25;

    let timeRange = maxTime - minTime;
    maxTime += timeRange * 0.1;
    timeRange = maxTime - minTime;

    if (log) {
      maxPrice = Math.log(maxPrice);
      minPrice = Math.log(minPrice);
    }

    let priceRange = maxPrice - minPrice;
    minPrice -= priceRange * 0.1;
    maxPrice += priceRange * 0.1;
    priceRange = maxPrice - minPrice;

    const timeToX = (time: number): number => Math.round((time - minTime) / timeRange * (canvas.width - paddingRight));
    const priceToY = (price: number): number => Math.round((canvas.height - paddingBottom) - ((log ? Math.log(price) : price) - minPrice) / priceRange * (canvas.height - paddingBottom));

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
          const y = priceToY(value);

          if (prevY && Math.abs(y - prevY) < 20) {
            continue;
          }
          prevY = y;

          if (y < 0 || y >= canvas.height - paddingBottom) continue;

          context.fillStyle = colors.marker;
          context.fillRect(0, y, canvas.width - paddingRight + 5, 1);

          context.fillStyle = colors.label;
          context.font = '10px Roboto';
          context.fillText(Util.numberToString(value), canvas.width - 50, y + 3);
        }
      }
    } else {
      let priceInterval = 1;
      while (true) {
        const size = Math.abs(priceToY(priceInterval * 2) - priceToY(priceInterval));

        if (size < 25) {
          priceInterval *= 1.1;
        } else if (size > 45) {
          priceInterval *= 0.9;
        } else {
          break;
        }
      }

      for (let l = Math.ceil(minPrice / priceInterval) * priceInterval; l <= maxPrice; l += priceInterval) {
        const y = priceToY(l);

        context.fillStyle = colors.marker;
        context.fillRect(0, y, canvas.width - paddingRight + 5, 1);

        context.fillStyle = colors.label;
        context.font = '10px Roboto';
        context.fillText(Util.numberToString(l), canvas.width - 50, y + 3);
      }
    }

    let timeInterval = 1;
    while (true) {
      const size = Math.abs(timeToX(timeInterval * 2) - timeToX(timeInterval));

      if (size < 80) {
        timeInterval *= 1.1;
      } else if (size > 150) {
        timeInterval *= 0.9;
      } else {
        break;
      }
    }

    for (let l = Math.floor(minTime / timeInterval) * timeInterval; l <= maxTime; l += timeInterval) {
      const x = timeToX(l);

      context.fillStyle = colors.marker;
      context.fillRect(x, 0, 1, canvas.height - paddingBottom + 5);

      context.fillStyle = colors.label;
      context.font = '10px Roboto Condensed';

      const time = new Date(l * 1000);

      const text = timeInterval > 3600 * 24 ? `${time.getUTCDate()} ${shortMonthNames[time.getUTCMonth()]} ${time.getUTCFullYear()}` : `${shortDayNames[time.getUTCDay()]} ${padZeros(time.getUTCHours(), 2)}:${padZeros(time.getUTCMinutes(), 2)}`;
      const textSize = context.measureText(text);
      context.fillText(text, x - textSize.width / 2, canvas.height - 8);
    }

    return [timeToX, priceToY, paddingRight, paddingBottom];
}

export const render = (
  canvas: HTMLCanvasElement, 
  dataCandles: Candles, 
  startTime: number, 
  endTime: number, 
  positions: Position[], 
  settings: Settings
): void => {
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

    const [timeToX, priceToY, paddingRight, paddingBottom] = axes(
        canvas, 
        context, 
        minTime, 
        maxTime,
        minPrice,
        maxPrice
    );

    let candleWidth = (canvas.width / (endIndex - startIndex)) * 0.5;
    for (let i = 1; i < canvas.width; i += 2) {
      if (candleWidth < i) {
        candleWidth = i;
        break;
      }
    }

    for (let i = startIndex; i < endIndex; i++) {
      const candle = candles.get(i);

      const x = timeToX(candle.time);
      const high = priceToY(candle.high);
      const low =  priceToY(candle.low);
      const open =  priceToY(candle.open);
      const close =  priceToY(candle.close);

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

    const drawMA = (length: number, source: 'open' | 'high' | 'low' | 'close') => {
      for (let i = Math.max(startIndex, length + 1); i < endIndex; i++) {
        context.beginPath();
        context.moveTo(
          timeToX(candles.get(i - 1).time), 
          priceToY(Library.ma(candles, length, source, candles.length - 1 - i + 1))
        );
        context.lineTo(
          timeToX(candles.get(i).time), 
          priceToY(Library.ma(candles, length, source, candles.length - 1 - i))
        );
        context.stroke();
      }
    };

    context.strokeStyle = "#007ac1";
    context.lineWidth = 2;
    drawMA(9, 'high');
    drawMA(9, 'low');

    const macdCandles = dataCandles.transform('4h');
    const macdValues = [];

    for (let i = startIndex; i < endIndex; i++) {
      const index = macdCandles.getIndexOfTime(candles.get(i).time);
      const macd = Library.macd(macdCandles.range(index - 500, index), 1);
      macdValues.push(macd);
    }

    let [minMacd, maxMacd] = Util.minMax(macdValues);
    if (minMacd > 0) minMacd = 0;
    if (maxMacd < 0) maxMacd = 0;

    let macdIndex = 0;

    for (let i = startIndex; i < endIndex; i++) {
      const macd = macdValues[macdIndex++];

      const ratio = (macd - minMacd) / (maxMacd - minMacd);
      const zeroRatio = (0 - minMacd) / (maxMacd - minMacd);
      const height = 50;

      if (macd > 0) {
        context.fillStyle = Library.roc(candles, 260, candles.length - 1 - i) > 0 ? '#4CAF50' : '#FF9800';
        context.fillRect(
          timeToX(candles.get(i).time) - 5,
          canvas.height - paddingBottom - (ratio * height),
          10,
          (ratio - zeroRatio) * height
        );
      } else {
        context.fillStyle = '#FF5252';
        context.fillRect(
          timeToX(candles.get(i).time) - 5,
          canvas.height - paddingBottom - (zeroRatio * height),
          10,
          (zeroRatio - ratio) * height
        );
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

  export const renderSeries = (canvas: HTMLCanvasElement, times: number[], series: number[][], seriesColors: string[]): void => {
    const context = init(canvas);

    context.fillStyle = colors.background;
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (times.length === 0) return;

    let minPrice = Number.MAX_VALUE;
    let maxPrice = -Number.MAX_VALUE;
    for (const prices of series) {
      const [seriesMinPrice, seriesMaxPrice] = Util.minMax(prices);
      if (seriesMinPrice < minPrice) minPrice = seriesMinPrice;
      if (seriesMaxPrice > maxPrice) maxPrice = seriesMaxPrice;
    }

    const [timeToX, priceToY] = axes(
      canvas, 
      context, 
      times[0], 
      times[times.length - 1],
      minPrice,
      maxPrice,
      true
    );
    
    for (let s = 0; s < series.length; s++) {
      const prices = series[s];

      context.strokeStyle = seriesColors[s];
      
      for (let i = 0; i < times.length - 1; i++) {
        context.beginPath();
        context.moveTo(timeToX(times[i]), priceToY(prices[i]));
        context.lineTo(timeToX(times[i + 1]), priceToY(prices[i + 1]));
        context.stroke();
        context.closePath();
      }
    }
  };