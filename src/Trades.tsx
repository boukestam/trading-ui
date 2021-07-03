import React from "react";
import { Util } from "trading-lib";
import { Display } from "./Display";
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
        {trades.map((trade, tradeIndex) => (
          <tr className="trade" key={tradeIndex} onClick={() => {
            console.log(trade);
            onClick(trade);
          }}>
            <td>{trade.symbol}</td>
            <td>{trade.direction}</td>
            <td>{Display.number(trade.amount)}</td>
            <td>{trade.buyDate && Util.timeToString(trade.buyDate)}</td>
            <td>{trade.sellDate && Util.timeToString(trade.sellDate)}</td>
            <td>
              <span className={(trade.profits || 0) > 0 ? 'text-profit' : 'text-loss'}>
                {Display.number(trade.profits || 0)}
              </span>
            </td>
            <td>{Display.number(trade.buy)}</td>
            <td>{trade.sell && Display.number(trade.sell)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
};