import { Util } from "trading-lib";
import { axes } from "./Axes";
import { calculateBarWidth, colors, init } from "./Render";
import { roundRect } from "./RoundRect";

export const renderBars = (
  canvas: HTMLCanvasElement, 
  x: number[], 
  y: number[], 
  xFormat: (x: number | string, interval: number) => string,
  yFormat: (y: number, interval: number) => string,
  log: boolean = false
): void => {
  const context = init(canvas);

  context.fillStyle = colors.background;
  context.lineWidth = 3;
  context.lineCap = 'round';
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (x.length === 0) return;

  axes(
    canvas,
    context,
    [x[0], x[x.length - 1]],
    (minX, maxX) => {
      let minY = Number.MAX_VALUE;
      let maxY = -Number.MAX_VALUE;
      for (let i = 0; i < x.length; i++) {
        if (x[i] >= minX && x[i] <= maxX) {
          if (y[i] < minY) minY = y[i];
          if (y[i] > maxY) maxY = y[i];
        }
      }
      return [minY, maxY];
    },
    xFormat,
    yFormat,
    log,
    (xToCanvas, yToCanvas) => {
      const barWidth = calculateBarWidth(canvas.width, x.length);

      for (let i = 0; i < x.length; i++) {
        const canvasZero = yToCanvas(0);
        const canvasY = yToCanvas(y[i]);

        if (canvasY < canvasZero) {
          context.fillStyle = colors.green;
          roundRect(
            context, 
            xToCanvas(x[i]) - (barWidth - 1) / 2,
            canvasY,
            barWidth,
            Math.max(1, canvasZero - canvasY),
            {tl: 3, tr: 3, br: 0, bl: 0},
            true,
            false
          );
        } else if (canvasY > canvasZero) {
          context.fillStyle = colors.red;
          roundRect(
            context, 
            xToCanvas(x[i]) - (barWidth - 1) / 2,
            canvasZero,
            barWidth,
            Math.max(1, canvasY - canvasZero),
            {tl: 0, tr: 0, br: 3, bl: 3},
            true,
            false
          );
        }
      }
    }
  );
};