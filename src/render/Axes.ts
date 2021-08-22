import { collapseTextChangeRangesAcrossMultipleVersions } from "typescript";
import { colors } from "./Render";

export const axes = (
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  xAxes: number[] | string[],
  getYRange: (minX: number, maxX: number) => [number, number],
  xFormat: (x: number | string, interval: number) => string,
  yFormat: (y: number, interval: number) => string,
  log: boolean,
  render: (
    xToCanvas: (x: number | string) => number, 
    yToCanvas: (y: number) => number, 
    paddingRight: number, 
    paddingBottom: number
  ) => void
): void => {
  const paddingRight = 60;
  const paddingBottom = 25;

  let minX = 0, maxX = 0;

  if (xAxes.length === 2 && typeof xAxes[0] === 'number') {
    [minX, maxX] = xAxes as number[];
  } else {
    minX = 0;
    maxX = xAxes.length - 1;
  }

  let xRange = maxX - minX;
  maxX += xRange * 0.1;
  xRange = maxX - minX;

  const xToCanvas = xAxes.length === 2 && typeof xAxes[0] === 'number' ? 
    (x: number): number => Math.round((x - minX) / xRange * (canvas.width - paddingRight)) :
    (x: number | string): number => Math.round(((xAxes as any[]).indexOf(x) - minX) / xRange * (canvas.width - paddingRight));

  let minY = 0, maxY = 0, yRange = 0;

  const fitY = () => {
    [minY, maxY] = getYRange(minX, maxX);

    if (log) {
      maxY = Math.log(Math.max(maxY, 0) + 1);
      minY = Math.log(Math.max(minY, 0) + 1);
    }

    yRange = maxY - minY;
    minY -= yRange * 0.1;
    maxY += yRange * 0.1;
    yRange = maxY - minY;

    if (yRange === 0) {
      minY -= 0.01;
      yRange = 0.01;
    }
  };

  fitY();

  const yToCanvas = (y: number): number => Math.round((canvas.height - paddingBottom) - ((log ? Math.log(Math.max(y, 0) + 1) : y) - minY) / yRange * (canvas.height - paddingBottom));

  const rerender = function () {
    context.fillStyle = colors.background
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = colors.border;
    context.fillRect(canvas.width - paddingRight, 0, 1, canvas.height);

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
          context.font = '10px Poppins';
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
        context.font = '10px Poppins';
        context.fillText(yFormat(l, yInterval), canvas.width - 50, y + 3);
      }
    }
    
    if (xAxes.length === 2 && typeof xAxes[0] === 'number') {
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
        context.font = '10px Poppins';

        const text = xFormat(l, xInterval);
        const textSize = context.measureText(text);
        context.fillText(text, x - textSize.width / 2, canvas.height - 8);
      }
    } else {
      for (let i = 0; i < xAxes.length; i++) {
        const x = (xToCanvas as (x: number | string) => number)(xAxes[i]);

        context.fillStyle = colors.marker;
        context.fillRect(x, 0, 1, canvas.height - paddingBottom + 5);

        context.fillStyle = colors.label;
        context.font = '10px Poppins';

        const text = xFormat(xAxes[i], 0);
        const textSize = context.measureText(text);
        context.fillText(text, x - textSize.width / 2, canvas.height - 8);
      }
    }

    render(
      xToCanvas as (x: number | string) => number, 
      yToCanvas, 
      paddingRight, 
      paddingBottom
    );
  }

  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();

    const delta = e.deltaY > 0 ? 0.1 : -0.1;

    const xCenter = (maxX + minX) / 2;
    minX = xCenter - xRange * (0.5 + delta);
    maxX = xCenter + xRange * (0.5 + delta);
    xRange = maxX - minX;
    
    fitY();
    rerender();
  });

  let mouseDown = false;

  canvas.addEventListener('mousedown', (e) => {
    mouseDown = true;
  });

  canvas.addEventListener('mouseup', (e) => {
    mouseDown = false;
  });

  canvas.addEventListener('mouseleave', (e) => {
    mouseDown = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (mouseDown) {
      const shift = (e.movementX / canvas.width) * xRange;
      minX -= shift;
      maxX -= shift;

      fitY();
      rerender();
    }
  });

  rerender();
}