import React from 'react';

export const Display = {
  numToString: (num: number | string): string => {
    if (typeof num === 'string') {
      if (num.match(/[a-z]/i) || isNaN(parseFloat(num))) return num;
      num = parseFloat(num);
    }
  
    if (num === 0) return num.toString();
    if (Math.abs(num) < 0.01) return num.toFixed(4);
    if (Math.abs(num) < 0.1) return num.toFixed(3);
    if (Math.abs(num) < 10) return num === Math.floor(num) ? num.toString() : num.toFixed(2);
    if (Math.abs(num) < Math.pow(10, 3)) return num === Math.floor(num) ? num.toString() : num.toFixed(1);
    if (Math.abs(num) < Math.pow(10, 6)) return (num / Math.pow(10, 3)).toFixed(1) + 'K';
    if (Math.abs(num) < Math.pow(10, 9)) return (num / Math.pow(10, 6)).toFixed(1) + 'M';
    if (Math.abs(num) < Math.pow(10, 12)) return (num / Math.pow(10, 9)).toFixed(1) + 'B';
    if (Math.abs(num) < Math.pow(10, 15)) return (num / Math.pow(10, 12)).toFixed(1) + 'T';
    return (num / Math.pow(10, 15)).toFixed(1) + 'P';
  },
  number: (num: number | string): JSX.Element => {
    const s = Display.numToString(num);
    return <span title={num.toString()}>{s}</span>;
  },
  percentageToString: (ratio: number): string => {
    return Display.numToString(ratio * 100) + '%';
  },
  percentage: (ratio: number): JSX.Element => {
    const s = Display.percentageToString(ratio);
    return <span title={ratio.toString()}>{s}</span>;
  },
};