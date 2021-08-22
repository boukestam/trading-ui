import React from "react";
import { useEffect } from "react";
import { Point3D, render3D } from "../render/3D";

export const Graph3D = ({data, axes}: {
  data: Point3D[],
  axes: string[]
}) => {
  const canvasRef = React.createRef<HTMLCanvasElement>();

  useEffect(() => {
    if (!canvasRef.current) return;

    render3D(
      canvasRef.current,
      data,
      axes
    );
  }, [canvasRef]);

  return <canvas ref={canvasRef} height={400}></canvas>
}