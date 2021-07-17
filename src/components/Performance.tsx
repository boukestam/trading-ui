import React, { useEffect } from 'react';
import { Util } from 'trading-lib';
import { Analysis } from '../services/Analysis';
import { Display } from '../services/Display';
import { renderBars } from '../services/Render';
import {  SimulationResult } from '../services/Simulation';

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
    const step = (max - min) / 100;

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

  return <div className="container">
    <div className="container-header">Return distribution</div>
    <canvas id="performance-canvas"></canvas>
  </div>
});