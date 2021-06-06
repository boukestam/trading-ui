export const Display = {
  number: (num: number): string => {
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },
  percentage: (ratio: number): string => {
    return Display.number(ratio * 100) + '%';
  },
};