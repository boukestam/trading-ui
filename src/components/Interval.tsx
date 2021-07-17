import React, { useEffect } from 'react';
import { Util } from 'trading-lib';
import { Analysis } from '../services/Analysis';
import { Display } from '../services/Display';
import { dateToString, renderBars } from '../services/Render';
import {  SimulationResult } from '../services/Simulation';

export const Interval = React.memo(
  (
    {result}: { 
      result: SimulationResult; 
    }
  ) => {
  useEffect(() => {
    const trades = Analysis.getPerformanceTrades(result);

    const x = [];
    const y = [];

    const [min, max] = Util.minMax(trades.map(trade => trade.buyDate.getTime() / 1000));
    const step = (max - min) / 100;

    for (let i = min; i < max; i += step) {
      x.push(i);
      y.push(trades.reduce((a, v) => {
        if (v.buyDate.getTime() / 1000 > i && v.buyDate.getTime() / 1000 <= i + step) a++;
        return a;
      }, 0));
    }

    renderBars(
      document.getElementById('time-distribution-canvas') as HTMLCanvasElement,
      x,
      y,
      dateToString,
      Display.number,
      false
    );
  });

  return <div className="container">
    <div className="container-header">Time distribution</div>
    <canvas id="time-distribution-canvas"></canvas>
  </div>
});