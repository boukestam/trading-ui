import { Util } from "trading-lib";
import { axes } from "./Axes";
import { colors, hexToRgb, init } from "./Render";

export const renderLines = (
  canvas: HTMLCanvasElement, 
  x: number[] | string[], 
  series: number[][], 
  seriesColors: string[],
  xFormat: (x: number | string, interval: number) => string,
  yFormat: (y: number, interval: number) => string,
  log: boolean = false,
  strictX: boolean = false
): void => {
  const context = init(canvas);

  context.fillStyle = colors.background;
  context.lineWidth = 3;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (x.length === 0) return;

  let minY = Number.MAX_VALUE;
  let maxY = -Number.MAX_VALUE;
  for (const y of series) {
    const [seriesMinY, seriesMaxY] = Util.minMax(y);
    if (seriesMinY < minY) minY = seriesMinY;
    if (seriesMaxY > maxY) maxY = seriesMaxY;
  }

  axes(
    canvas,
    context,
    strictX ? x : [x[0], x[x.length - 1]] as string[] | number[],
    (minX, maxX) => {
      let minY = Number.MAX_VALUE;
      let maxY = -Number.MAX_VALUE;
      for (const y of series) {
        for (let i = 0; i < x.length; i++) {
          if (x[i] >= minX && x[i] <= maxX) {
            if (y[i] < minY) minY = y[i];
            if (y[i] > maxY) maxY = y[i];
          }
        }
      }
      return [minY, maxY];
    },
    xFormat,
    yFormat,
    log,
    (xToCanvas, yToCanvas, _, paddingBottom) => {
      for (let s = 0; s < series.length; s++) {
        const y = series[s];
        if (y.length === 0 || x.length === 0) continue;
    
        context.strokeStyle = seriesColors[s];
    
        const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, `rgba(${Object.values(hexToRgb(seriesColors[s])).join(',')}, 0.5)`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        context.fillStyle = gradient;
    
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
    }
  );
};