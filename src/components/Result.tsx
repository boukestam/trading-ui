import React from 'react';
import { Settings, Util } from 'trading-lib';
import { Analysis } from '../services/Analysis';
import { Display } from '../services/Display';
import { SimulationResult } from '../services/Simulation';
import { SimulationSettings } from '../services/SimulationSettings';
import { SimulationUtil } from '../services/SimulationUtil';

export const Result = React.memo(
  (
    {result, simSettings, settings, onClickSymbol}: { 
      result: SimulationResult; 
      simSettings: SimulationSettings; 
      settings: Settings,
      onClickSymbol: (symbol: string) => void
    }
  ) => {
  const performanceTrades = Analysis.getPerformanceTrades(result).sort((a, b) => a.sellDate.getTime() - b.sellDate.getTime());

  const longs = Analysis.longs(performanceTrades);
  const shorts = Analysis.shorts(performanceTrades);

  const monteCarloResult = Analysis.monteCarlo(result, performanceTrades, 1000, simSettings);

  return (<>
    <div className="results container">
      <div className="container-header">Analysis</div>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>All</th>
            <th>Long</th>
            <th>Short</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total</td>
            <td>{performanceTrades.length}</td>
            <td>{longs.length}</td>
            <td>{shorts.length}</td>
          </tr>
          <tr>
            <td>Winners</td>
            <td>{Analysis.winners(performanceTrades).length}</td>
            <td>{Analysis.winners(longs).length}</td>
            <td>{Analysis.winners(shorts).length}</td>
          </tr>
          <tr>
            <td>Losers</td>
            <td>{Analysis.losers(performanceTrades).length}</td>
            <td>{Analysis.losers(longs).length}</td>
            <td>{Analysis.losers(shorts).length}</td>
          </tr>
          <tr>
            <td>Average duration</td>
            <td>{Analysis.averageDuration(performanceTrades)}</td>
            <td>{Analysis.averageDuration(longs)}</td>
            <td>{Analysis.averageDuration(shorts)}</td>
          </tr>
          <tr>
            <td>Expected value</td>
            <td>{Display.percentage(Analysis.expectedValue(performanceTrades))}</td>
            <td>{Display.percentage(Analysis.expectedValue(longs))}</td>
            <td>{Display.percentage(Analysis.expectedValue(shorts))}</td>
          </tr>
          <tr>
            <td>Expected value adj</td>
            <td>{Display.percentage(
              Analysis.expectedValueOnMargin(performanceTrades)
            )}</td>
            <td>{Display.percentage(
              Analysis.expectedValueOnMargin(longs)
            )}</td>
            <td>{Display.percentage(
              Analysis.expectedValueOnMargin(shorts)
            )}</td>
          </tr>
          <tr>
            <td>Expectation</td>
            <td>{Display.number(Analysis.expectation(performanceTrades))}</td>
            <td>{Display.number(Analysis.expectation(longs))}</td>
            <td>{Display.number(Analysis.expectation(shorts))}</td>
          </tr>
          <tr>
            <td>Biggest winner</td>
            <td>{Display.percentage(Analysis.biggestWinner(performanceTrades))}</td>
            <td>{Display.percentage(Analysis.biggestWinner(longs))}</td>
            <td>{Display.percentage(Analysis.biggestWinner(shorts))}</td>
          </tr>
          <tr>
            <td>Biggest loser</td>
            <td>{Display.percentage(Analysis.biggestLoser(performanceTrades))}</td>
            <td>{Display.percentage(Analysis.biggestLoser(longs))}</td>
            <td>{Display.percentage(Analysis.biggestLoser(shorts))}</td>
          </tr>
          <tr>
            <td>Winning streak</td>
            <td>{Display.number(Analysis.winningStreak(performanceTrades))}</td>
            <td>{Display.number(Analysis.winningStreak(longs))}</td>
            <td>{Display.number(Analysis.winningStreak(shorts))}</td>
          </tr>
          <tr>
            <td>Losing streak</td>
            <td>{Display.number(Analysis.losingStreak(performanceTrades))}</td>
            <td>{Display.number(Analysis.losingStreak(longs))}</td>
            <td>{Display.number(Analysis.losingStreak(shorts))}</td>
          </tr>
          <tr>
            <td>Net profit</td>
            <td>${Display.number(Analysis.netProfit(performanceTrades))}</td>
            <td>${Display.number(Analysis.netProfit(longs))}</td>
            <td>${Display.number(Analysis.netProfit(shorts))}</td>
          </tr>
          <tr>
            <td>Gross profit</td>
            <td>${Display.number(Analysis.grossProfit(performanceTrades))}</td>
            <td>${Display.number(Analysis.grossProfit(longs))}</td>
            <td>${Display.number(Analysis.grossProfit(shorts))}</td>
          </tr>
          <tr>
            <td>Gross loss</td>
            <td>${Display.number(Analysis.grossLoss(performanceTrades))}</td>
            <td>${Display.number(Analysis.grossLoss(longs))}</td>
            <td>${Display.number(Analysis.grossLoss(shorts))}</td>
          </tr>
          <tr>
            <td>Time in market</td>
            <td>{Display.percentage(Analysis.ratioTimeInMarket(result, performanceTrades))}</td>
            <td>{Display.percentage(Analysis.ratioTimeInMarket(result, longs))}</td>
            <td>{Display.percentage(Analysis.ratioTimeInMarket(result, shorts))}</td>
          </tr>
          <tr>
            <td>Avg trades open</td>
            <td>{Display.number(Analysis.averageTradesInMarket(result, performanceTrades))}</td>
            <td>{Display.number(Analysis.averageTradesInMarket(result, longs))}</td>
            <td>{Display.number(Analysis.averageTradesInMarket(result, shorts))}</td>
          </tr>
          <tr>
            <td>ROI</td>
            <td>{Display.percentage((Analysis.roi(performanceTrades, simSettings)))}</td>
            <td>{Display.percentage((Analysis.roi(longs, simSettings)))}</td>
            <td>{Display.percentage((Analysis.roi(shorts, simSettings)))}</td>
          </tr>
          <tr>
            <td>Annual ROI</td>
            <td>{Display.percentage((Analysis.annualROI(result, performanceTrades, simSettings)))}</td>
            <td>{Display.percentage((Analysis.annualROI(result, longs, simSettings)))}</td>
            <td>{Display.percentage((Analysis.annualROI(result, shorts, simSettings)))}</td>
          </tr>
          <tr>
            <td>Montly ROI</td>
            <td>{Display.percentage((Analysis.monthlyROI(result, performanceTrades, simSettings)))}</td>
            <td>{Display.percentage((Analysis.monthlyROI(result, longs, simSettings)))}</td>
            <td>{Display.percentage((Analysis.monthlyROI(result, shorts, simSettings)))}</td>
          </tr>
          <tr>
            <td>Win std err</td>
            <td>{Display.percentage(Analysis.expectedValue(
              Analysis.winners(performanceTrades)
            ))} +- {Display.percentage(Analysis.standardError(
              Analysis.winners(performanceTrades)
            ))}</td>
            <td>{Display.percentage(Analysis.expectedValue(
              Analysis.winners(longs)
            ))} +- {Display.percentage(Analysis.standardError(
              Analysis.winners(longs)
            ))}</td>
            <td>{Display.percentage(Analysis.expectedValue(
              Analysis.winners(shorts)
            ))} +- {Display.percentage(Analysis.standardError(
              Analysis.winners(shorts)
            ))}</td>
          </tr>
          <tr>
            <td>Loss std err</td>
            <td>{Display.percentage(Analysis.expectedValue(
              Analysis.losers(performanceTrades)
              ))} +- {Display.percentage(Analysis.standardError(
                Analysis.losers(performanceTrades)
              ))}</td>
            <td>{Display.percentage(Analysis.expectedValue(
              Analysis.losers(longs)
              ))} +- {Display.percentage(Analysis.standardError(
                Analysis.losers(longs)
              ))}</td>
            <td>{Display.percentage(Analysis.expectedValue(
              Analysis.losers(shorts)
              ))} +- {Display.percentage(Analysis.standardError(
                Analysis.losers(shorts)
              ))}</td>
          </tr>
          <tr>
            <td>Sharpe ratio</td>
            <td>{Display.percentage(
              Analysis.sharpeRatio(performanceTrades, simSettings)
            )}</td>
            <td>{Display.percentage(
              Analysis.sharpeRatio(longs, simSettings)
            )}</td>
            <td>{Display.percentage(
              Analysis.sharpeRatio(shorts, simSettings)
            )}</td>
          </tr>
          <tr>
            <td>Portfolio size</td>
            <td>${Display.number(result.portfolioHistory.slice(-1)[0])}</td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>Cash</td>
            <td>${Display.number(result.balanceHistory.slice(-1)[0])}</td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>Max drawdown</td>
            <td>{Display.percentage(Analysis.maxDrawdown(performanceTrades))}</td>
          </tr>
          <tr>
            <td>Avg drawdown</td>
            <td>{Display.percentage(Analysis.averageDrawdown(performanceTrades))}</td>
          </tr>
          <tr>
            <td>Win ratio</td>
            <td>{Display.percentage(Analysis.winners(performanceTrades).length / (performanceTrades.length))}</td>
          </tr>
          <tr>
            <td>Divergence</td>
            <td>{Display.number(Analysis.divergence(result))}</td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>Kelly risk</td>
            <td>{Display.percentage(
              Analysis.kellyRisk(performanceTrades)
            )}</td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>Trading period</td>
            <td>{Util.durationToString((result.times[result.times.length - 1] - result.times[0]) * 1000)}</td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>Simulation time</td>
            <td>{(result.simulationTime / 1000).toFixed(2)} s</td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>Unrealized profits</td>
            <td>${
              Display.number((result.trades.filter(t => t.filled && !t.closed).reduce((a, v) => a + SimulationUtil.getTradeProfits(v, result.closePrices[v.symbol], settings.fee) - v.cost, 0)))
            }</td>
            <td>{
              Display.number(result.trades.filter(t => t.filled && !t.closed && t.direction === 'long').length)
            }</td>
            <td>{
              Display.number(result.trades.filter(t => t.filled && !t.closed && t.direction === 'short').length)
            }</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="results container">
      <div className="container-header">Results per symbol</div>
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Trades</th>
            <th>Exp Value</th>
            <th>Std error</th>
            <th>Sharpe ratio</th>
          </tr>
        </thead>
        <tbody>
          {simSettings.symbols.map(symbol => <tr key={symbol}>
            <td onClick={() => onClickSymbol(symbol)}>{symbol}</td>
            <td>{performanceTrades.filter(t => t.symbol === symbol).length}</td>
            <td>{Display.percentage(Analysis.expectedValue(
              performanceTrades.filter(t => t.symbol === symbol)
            ))}</td>
            <td>+- {Display.percentage(
              Analysis.standardError(
                performanceTrades.filter(t => t.symbol === symbol)
              )
            )}</td>
            <td>{Display.percentage(
              Analysis.sharpeRatio(
                performanceTrades.filter(t => t.symbol === symbol), 
                simSettings
              )
            )}</td>
          </tr>)}
        </tbody>
      </table>
    </div>

    <div className="results container">
      <div className="container-header">Monte Carlo analysis</div>
      <table>
        <thead>
          <tr>
            <th>Percent</th>
            <th>Monthly ROI</th>
            <th>Max drawdown</th>
          </tr>
        </thead>
        <tbody>
          {monteCarloResult.map((result, resultIndex) => <tr key={resultIndex}>
            <td>{Display.percentage(result.percent)}</td>
            <td>{Display.percentage(result.monthlyROI)}</td>
            <td>{Display.percentage(result.drawdown)}</td>
          </tr>)}
        </tbody>
      </table>
    </div>

  <div className="results container">
    <div className="container-header">Daily returns</div>
    <table>
      <thead>
        <tr>
          <th>Day</th>
          <th>Expected value</th>
        </tr>
      </thead>
      <tbody>
        {Analysis.dayOfWeekExpectedValue(performanceTrades).map((result, resultIndex) => <tr key={resultIndex}>
          <td>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][result.day]}</td>
          <td>{Display.percentage(result.expectedValue)}</td>
        </tr>)}
      </tbody>
    </table>
  </div>

    <div className="results container">
      <div className="container-header">Hourly returns</div>
      <table>
        <thead>
          <tr>
            <th>Hour</th>
            <th>Expected value</th>
          </tr>
        </thead>
        <tbody>
          {Analysis.hourOfDayExpectedValue(performanceTrades).map((result, resultIndex) => <tr key={resultIndex}>
            <td>{Display.number(result.hour)}</td>
            <td>{Display.percentage(result.expectedValue)}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </>
)});