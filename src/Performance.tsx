import React, { useEffect } from 'react';
import { Util } from 'trading-lib';
import { Analysis } from './Analysis';
import { Display } from './Display';
import { renderBars } from './Render';
import {  SimulationResult } from './Simulation';

export const Performance = React.memo(
  (
    {result}: { 
      result: SimulationResult; 
    }
  ) => {
  useEffect(() => {
    const trades = Analysis.getPerformanceTrades(result);

    const x = [];
    const y = [];

    const [min, max] = Util.minMax(trades.map(trade => trade.performance));
    const step = (max - min) / 20;

    for (let i = min; i < max; i += step) {
      x.push(i);
      y.push(trades.reduce((a, v) => {
        if (v.performance > i && v.performance <= i + step) a++;
        return a;
      }, 0));
    }

    renderBars(
      document.getElementById('performance-canvas') as HTMLCanvasElement,
      x,
      y,
      Display.number,
      Display.number,
      false
    );
  });

  return <canvas id="performance-canvas" className="container"></canvas>
});