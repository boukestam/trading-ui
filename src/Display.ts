export const Display = {
  number: (num: number): string => {
    if (Math.abs(num) < 0.1) return num.toFixed(3);
    if (Math.abs(num) < 10) return num.toFixed(2);
    if (Math.abs(num) < Math.pow(10, 3)) return num.toFixed(1);
    if (Math.abs(num) < Math.pow(10, 6)) return (num / Math.pow(10, 3)).toFixed(1) + 'K';
    if (Math.abs(num) < Math.pow(10, 9)) return (num / Math.pow(10, 6)).toFixed(1) + 'M';
    if (Math.abs(num) < Math.pow(10, 12)) return (num / Math.pow(10, 9)).toFixed(1) + 'B';
    if (Math.abs(num) < Math.pow(10, 15)) return (num / Math.pow(10, 12)).toFixed(1) + 'T';
    return (num / Math.pow(10, 15)).toFixed(1) + 'P';
  },
  percentage: (ratio: number): string => {
    return Display.number(ratio * 100) + '%';
  },
};