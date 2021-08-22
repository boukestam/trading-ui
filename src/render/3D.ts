import { Display } from "../services/Display";
import { init } from "./Render";

export type Point3D = [number, number, number];

export const render3D = (
  canvas: HTMLCanvasElement,
  data: Point3D[],
  axes: string[]
) => {
  if (data.length === 0) return;

  const context = init(canvas);

  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const xStart = Math.min(...data.map(d => d[0]));
  const xEnd = Math.max(...data.map(d => d[0]));
  const xRange = xEnd - xStart;

  const yStart = Math.min(...data.map(d => d[1]));
  const yEnd = Math.max(...data.map(d => d[1]));
  const yRange = yEnd - yStart;

  const zStart = Math.min(...data.map(d => d[2]));
  const zEnd = Math.max(...data.map(d => d[2]));
  const zRange = zEnd - zStart;

  if (xRange === 0 || yRange === 0 || zRange === 0) return;

  const toScreen = (x: number, y: number, z: number): [number, number] => [
    (canvas.width * 0.5) - 
    ((x - xStart) / xRange * canvas.width * 0.4) + 
    ((y - yStart) / yRange * canvas.width * 0.42)
    ,
    (canvas.height * 0.9) - 
    ((x - xStart) / xRange * canvas.height * 0.22) - 
    ((y - yStart) / yRange * canvas.height * 0.2) - 
    ((z - zStart) / zRange * canvas.height * 0.4)
  ];

  context.fillStyle = "black";
  context.fillText(axes[0], ...toScreen(xStart + xRange * 0.5, yStart - yRange * 0.3, zStart - zRange * 0.03));

  for (let x = xStart; x <= xEnd; x += xRange / 5) {
    context.strokeStyle = x === 0 ? "black" : "lightGray";
    
    context.beginPath();
    context.moveTo(...toScreen(x, yStart, zStart));
    context.lineTo(...toScreen(x, yEnd, zStart));
    context.stroke();
    
    context.strokeStyle = "black";
    
    context.beginPath();
    context.moveTo(...toScreen(x, yStart - yRange * 0.03, zStart));
    context.lineTo(...toScreen(x, yStart, zStart));
    context.stroke();
    
    context.fillStyle = "black";
    const text = Display.numToString(x);
    const textPos = toScreen(x, yStart - yRange * 0.05, zStart - zRange * 0.04);
    context.fillText(text, textPos[0] - context.measureText(text).width, textPos[1]);
    
    context.strokeStyle = "lightGray";

    context.beginPath();
    context.moveTo(...toScreen(x, yEnd, zStart));
    context.lineTo(...toScreen(x, yEnd, zEnd));
    context.stroke();
  }

  context.fillStyle = "black";
  context.fillText(axes[1], ...toScreen(xStart - xRange * 0.3, yStart + yRange * 0.5, zStart - zRange * 0.03));

  for (let y = yStart; y <= yEnd; y += yRange / 5) {
    context.strokeStyle = y === 0 ? "black" : "lightGray";
    
    context.beginPath();
    context.moveTo(...toScreen(xStart, y, zStart));
    context.lineTo(...toScreen(xEnd, y, zStart));
    context.stroke();
    
    context.strokeStyle = "black";
    
    context.beginPath();
    context.moveTo(...toScreen(xStart, y, zStart));
    context.lineTo(...toScreen(xStart - xRange * 0.03, y, zStart));
    context.stroke();
    
    context.fillStyle = "black";
    const text = Display.numToString(y);
    const textPos = toScreen(xStart - xRange * 0.06, y, zStart - zRange * 0.03);
    context.fillText(text, textPos[0], textPos[1]);
    
    context.strokeStyle = y === 0 ? "black" : "lightGray";
    
    context.beginPath();
    context.moveTo(...toScreen(xEnd, y, zStart));
    context.lineTo(...toScreen(xEnd, y, zEnd));
    context.stroke();
  }

  const zLabelPos = toScreen(xEnd + xRange * 0.07, yStart - yRange * 0.1, zStart + zRange * 0.5);
  context.save();
  context.translate(...zLabelPos);
  context.rotate(-Math.PI/2);
  context.fillStyle = "black";
  context.fillText(axes[2], 0, 0);
  context.restore();

  for (let z = zStart; z <= zEnd; z += zRange / 5) {
    context.strokeStyle = "lightGray";
    
    context.beginPath();
    context.moveTo(...toScreen(xEnd, yStart, z));
    context.lineTo(...toScreen(xEnd, yEnd, z));
    context.stroke();
    
    context.strokeStyle = "black";
    
    context.beginPath();
    context.moveTo(...toScreen(xEnd, yStart, z));
    context.lineTo(...toScreen(xEnd + xRange * 0.03, yStart, z));
    context.stroke();
    
    context.fillStyle = "black";
    const text = Display.numToString(z);
    const textPos = toScreen(xEnd + xRange * 0.05, yStart, z);
    context.fillText(text, textPos[0] - context.measureText(text).width, textPos[1]);

    context.strokeStyle = "lightGray";
    
    context.beginPath();
    context.moveTo(...toScreen(xStart, yEnd, z));
    context.lineTo(...toScreen(xEnd, yEnd, z));
    context.stroke();
  }

  const closest = (point: Point3D, dimensions: number[]) => {
    let closestPoint = undefined;

    outer:
    for (const d of data) {
      for (let i = 0; i < d.length - 1; i++) {
        if (dimensions.some(dimension => i === dimension)) continue;
        if (d[i] !== point[i]) continue outer;
      }
      
      let allTrue = true;
      
      for (const dimension of dimensions) {
        if (!(d[dimension] > point[dimension] && (!closestPoint || d[dimension] <= closestPoint[dimension]))) {
          allTrue = false;
        }
      }
      
      if (allTrue) {
        closestPoint = d;
      }
    }
    
    return closestPoint;
  };

  const distance = (point: Point3D) => Math.sqrt(
    Math.pow(point[0], 2) + Math.pow(point[1], 2)
  );

  data.sort((a, b) => distance(b) - distance(a));

  const colors = [
    '00009F',
    '0000DF',
    '0030FF',
    '007FFF',
    '00D0FF',
    '00FFFF',
    '3FFFD0',
    '5FFFB0',
    '7FFF90',
    'B0FF5F',
    'D0FF3F',
    'F0FF1F',
    'FFFF10',
    'FFD000',
    'FFB000',
    'FF7F00',
    'FF5F00',
    'FF3000',
    'FF1000',
    'D00000',
    '9F0000'
  ];

  for (const d of data) {
    const x = closest(d, [0]);
    const y = closest(d, [1]);
    const corner = closest(d, [0, 1]);
    
    if (x && y && corner) {
      const averageZ = (d[2] + x[2] + corner[2] + y[2]) / 4;
      
      context.fillStyle = '#' + colors[Math.floor(
        (averageZ - zStart) / zRange * colors.length
      )];
      
      context.beginPath();
      context.moveTo(...toScreen(...d));
      context.lineTo(...toScreen(...x));
      context.lineTo(...toScreen(...corner));
      context.lineTo(...toScreen(...y));
      context.fill();
    }
    
    if (x) {
      context.strokeStyle = "black";
      context.beginPath();
      context.moveTo(...toScreen(...d));
      context.lineTo(...toScreen(...x));
      context.stroke();
    }
    
    if (y) {
      context.strokeStyle = "black";
      context.beginPath();
      context.moveTo(...toScreen(...d));
      context.lineTo(...toScreen(...y));
      context.stroke();
    }
  }
}