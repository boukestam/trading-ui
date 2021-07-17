import React from 'react';
import { Analysis } from '../services/Analysis';
import { Display } from '../services/Display';
import { Data } from '../services/Loader';
import { SimulationCandles } from '../services/SimulationCandles';
import { SimulationSettings } from '../services/SimulationSettings';

export const Correlations = React.memo(({simSettings, data}: {
  simSettings: SimulationSettings,
  data: Data[]
}) => {

  return <div className="container correlation">
    <div className="container-header">Correlations</div>
    <table>
      <thead>
        <tr>
          <th></th>
          {simSettings.symbols.map(symbol => <th key={symbol}>
            {symbol}
          </th>)}
        </tr>
      </thead>
      <tbody>
        {simSettings.symbols.map(symbolX => <tr key={symbolX}>
          <td>{symbolX}</td>
          {simSettings.symbols.map(symbolY => <td key={symbolY}>{
            Display.number(Analysis.correlation(
              new SimulationCandles(
                data.find(d => d.symbol === symbolX)!.buffer, simSettings.dataInterval
              ),
              new SimulationCandles(
                data.find(d => d.symbol === symbolY)!.buffer, simSettings.dataInterval
              )
            )
          )}</td>)}
        </tr>)}
      </tbody>
    </table>
  </div>;
});