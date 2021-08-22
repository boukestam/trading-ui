export interface Position {
  side: 'long' | 'short',
  openTime: number,
  closeTime: number,
  openPrice: number,
  closePrice: number
}

export const colors = {
  background: '#ffffff',
  marker: '#ECECEC',
  border: '#ECECEC',
  label: '#C0C1C5',
  green: '#17B79A',
  red: '#E24948',
  open: '#087f23',
  close: '#ba000d',
  line: '#4D5C9B'
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

export const dateToString = (time: number | string, timeInterval: number): string => {
  const date = new Date(typeof time === 'number' ? time * 1000 : time);

  if (timeInterval > 3600 * 24) {
    return `${date.getUTCDate()} ${shortMonthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  } else {
    return `${shortDayNames[date.getUTCDay()]} ${padZeros(date.getUTCHours(), 2)}:${padZeros(date.getUTCMinutes(), 2)}`;
  }
}

export function hexToRgb(hex: string) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error('Invalid hex color in line graph');

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

export function calculateBarWidth (canvasWidth: number, count: number): number {
  let barWidth = (canvasWidth / count) * 0.5;
  for (let i = 1; i < canvasWidth; i += 2) {
    if (barWidth < i) {
      barWidth = i;
      break;
    }
  }
  return barWidth
}

export const init = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  canvas.width = canvas.getBoundingClientRect().width;
  canvas.height = canvas.getBoundingClientRect().height;
  return canvas.getContext('2d') as CanvasRenderingContext2D;
};