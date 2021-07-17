import React from 'react';
import { Analysis } from '../services/Analysis';
import { Display } from '../services/Display';
import {  SimulationResult } from '../services/Simulation';

export const Monthly = React.memo(
  (
    {result}: { 
      result: SimulationResult; 
    }
  ) => {
  return <div className="monthly container">
    <div className="container-header">Monthly returns</div>
    <table>
      <thead>
        <tr>
          <th></th>
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => <th key={month}>{month}</th>)}
        </tr>
      </thead>
      <tbody>
        {Analysis.monthlyROIS(result).map(year => <tr key={year.year}>
          <td><b>{year.year}</b></td>
          {year.months.map(month => <td key={month.month} className={month.roi > 0 ? 'text-profit' : 'text-loss'}>
            {Display.percentage(month.roi)}
          </td>)}
        </tr>)}
      </tbody>
    </table>
  </div>
});