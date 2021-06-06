import React from "react";
import { Util } from "trading-lib";
import { OutputTrade } from "./Simulation";

export function Trades ({trades, onClick}: {trades: OutputTrade[], onClick: (trade: OutputTrade) => void}) {
  return <div className="trades container">
    <table>
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Direction</th>
          <th>Amount</th>
          <th>Buy</th>
          <th>Sell</th>
          <th>Profit</th>
          <th>Open</th>
          <th>Close</th>
        </tr>
      </thead>
      <tbody>
        {trades.filter(trade => trade.filled && trade.closed).map((trade, tradeIndex) => (
          <tr className="trade" key={tradeIndex} onClick={() => onClick(trade)}>
            <td>{trade.symbol}</td>
            <td>{trade.direction}</td>
            <td>{trade.amount.toFixed(2)}</td>
            <td>{trade.buyDate && Util.timeToString(trade.buyDate)}</td>
            <td>{trade.sellDate && Util.timeToString(trade.sellDate)}</td>
            <td><span className={(trade.profits || 0) > 0 ? 'text-profit' : 'text-loss'}>{(trade.profits || 0).toFixed(2)}</span></td>
            <td>{trade.buy.toFixed(4)}</td>
            <td>{trade.sell.toFixed(4)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
};