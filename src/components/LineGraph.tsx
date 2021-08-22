import React from "react";
import { useEffect } from "react";
import { renderLines } from "../render/Lines";

export const LineGraph = ({x, y, colors, log, strictX, xFormat, yFormat}: {
  x: number[] | string[];
  y: number[][];
  colors: string[];
  log?: boolean;
  strictX?: boolean;
  xFormat: (x: number | string, interval: number) => string;
  yFormat: (y: number, interval: number) => string
}) => {
  const canvasRef = React.createRef<HTMLCanvasElement>();

  useEffect(() => {
    if (!canvasRef.current) return;

    renderLines(
      canvasRef.current,
      x,
      y,
      colors,
      xFormat,
      yFormat,
      log,
      strictX
    );
  }, [canvasRef]);

  return <canvas ref={canvasRef} height={200}></canvas>
}