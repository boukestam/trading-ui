import { Settings } from "trading-lib";
import { SimulationSettings } from "./services/SimulationSettings";

export interface Mode {
  capital: number;
  start: Date;
  end: Date;
  fee: number;
  fundingFee: number;
  leverage: number;
  interval: string;
  dataInterval: string;
  simulationInterval: string;
  getFileName: (symbol: string) => string;
  symbols: string[];
  minBalance: number;
  maxCost: number;
  risk: number;
  slippage: number;
  verboseLogger?: boolean;
};

const forexMode: Mode = {
  capital: 100,
  start: new Date(Date.UTC(2004, 0, 1)),
  end: new Date(Date.UTC(2021, 5, 13, 19)),
  fee: 0,
  slippage: 0.00015,
  fundingFee: 0.00005479452,
  leverage: 50,
  interval: '12h',
  dataInterval: '1h',
  simulationInterval: '1h',
  minBalance: 0.5,
  maxCost: 0.1,
  risk: 0.01,
  getFileName: (symbol: string) => `/data/cache/${symbol}-1h-futures-oanda-data.bin`,
  symbols: ['EUR_USD', 'GBP_USD','AUD_USD', 'EUR_GBP', 'USD_JPY', 'GBP_JPY', 'AUD_JPY', 'EUR_JPY']
  //['EURUSD','EURCHF',,,'EURAUD','USDCAD','USDCHF',,'USDMXN','GBPCHF',,'GBPUSD',,'AUDUSD','CHFJPY','NZDJPY','NZDUSD','XAUUSD','EURCAD','AUDCAD','CADJPY','EURNZD','GRXEUR','NZDCAD','SGDJPY','USDHKD','USDNOK','USDTRY','XAUAUD','AUDCHF','AUXAUD','EURHUF','EURPLN','FRXEUR','HKXHKD','NZDCHF','SPXUSD','USDHUF','USDPLN','USDZAR','XAUCHF','ZARJPY','BCOUSD','ETXEUR','EURCZK','EURSEK','GBPAUD','GBPNZD','JPXJPY','UDXUSD','USDCZK','USDSEK','WTIUSD','XAUEUR','AUDNZD','CADCHF','EURDKK','EURNOK','EURTRY','GBPCAD','NSXUSD','UKXGBP','USDDKK','USDSGD','XAGUSD','XAUGBP']
};

const commodityMode: Mode = {
  capital: 100,
  start: new Date(Date.UTC(2004, 0, 1)),
  end: new Date(Date.UTC(2019, 5, 17, 19)),
  fee: 0,
  slippage: 0.00015,
  fundingFee: 0.00005479452,
  leverage: 20,
  interval: '12h',
  dataInterval: '1h',
  simulationInterval: '1h',
  minBalance: 0,
  maxCost: 0.5,
  risk: 0.01,
  getFileName: (symbol: string) => `/data/cache/${symbol}-1h-futures-oanda-data.bin`,
  symbols: [
    'CORN_USD', 
    'XAU_USD',
    'XAG_USD', 
    'WHEAT_USD', 
    'SOYBN_USD', 
    'SUGAR_USD', 
    'WTICO_USD'
  ]
  //['EURUSD','EURCHF','EURGBP','EURJPY','EURAUD','USDCAD','USDCHF','USDJPY','USDMXN','GBPCHF','GBPJPY','GBPUSD','AUDJPY','AUDUSD','CHFJPY','NZDJPY','NZDUSD','XAUUSD','EURCAD','AUDCAD','CADJPY','EURNZD','GRXEUR','NZDCAD','SGDJPY','USDHKD','USDNOK','USDTRY','XAUAUD','AUDCHF','AUXAUD','EURHUF','EURPLN','FRXEUR','HKXHKD','NZDCHF','SPXUSD','USDHUF','USDPLN','USDZAR','XAUCHF','ZARJPY','BCOUSD','ETXEUR','EURCZK','EURSEK','GBPAUD','GBPNZD','JPXJPY','UDXUSD','USDCZK','USDSEK','WTIUSD','XAUEUR','AUDNZD','CADCHF','EURDKK','EURNOK','EURTRY','GBPCAD','NSXUSD','UKXGBP','USDDKK','USDSGD','XAGUSD','XAUGBP']
};

const altMode: Mode = {
  capital: 100,
  start: new Date(Date.UTC(2020, 0, 1)),
  end: new Date(Date.UTC(2021, 2, 1)),
  fee: 0.0007,
  fundingFee: 0.0001,
  leverage: 10,
  interval: '1h',
  dataInterval: '1h',
  simulationInterval: '1h',
  minBalance: 0.5,
  maxCost: 0.1,
  risk: 0.03,
  slippage: 0.001,
  // getFileName: (symbol: string) => `/data/cache/${symbol}-1h-futures-binance-data.bin`,
  // symbols: [
  //   'BTCUSDT',
  //   'ETHUSDT',
  //   'ADAUSDT',
  //   'UNIUSDT',
  //   'DOGEUSDT',
  //   'BNBUSDT',
  //   'VETUSDT',
  //   'TRXUSDT',
  //   'FILUSDT',
  //   'LINKUSDT',
  //   'ETCUSDT',
  //   'SOLUSDT'
  // ]
  getFileName: (symbol: string) => `/data/cache/${symbol}-1h-futures-ftx-data.bin`,
  symbols: [
    'ADA-PERP',
    'BNB-PERP',
    'BTC-PERP',
    'DOGE-PERP',
    'ETC-PERP',
    'ETH-PERP',
    'FIL-PERP',
    'LINK-PERP',
    'TRX-PERP',
    'UNI-PERP',
    'VET-PERP',
    'SOL-PERP',
    'FTT-PERP'
  ],
};

const allMode: Mode = {
  ...altMode,
  start: new Date(Date.UTC(2020, 11, 1)),
  end: new Date(Date.UTC(2021, 7, 26, 14))
};

const spotMode: Mode = {
  ...altMode,
  start: new Date(Date.UTC(2017, 8, 1)),
  end: new Date(Date.UTC(2020, 11, 1)),
  getFileName: (symbol: string) => `/data/cache/${symbol}-1h-spot-data.bin`,
  fee: 0.002,
  fundingFee: 0,
  leverage: 1,
  minBalance: 0.1,
  maxCost: 0.25,
  risk: 0.02,
};

const btcMode: Mode = {
  ...spotMode,
  start: new Date(Date.UTC(2017, 8, 1)),
  end: new Date(Date.UTC(2021, 5, 1)),
  symbols: [
    // 'ETHBTC',
    // 'ADABTC',
    // 'BNBBTC',
    // 'UNIBTC',
    // 'VETBTC',
    // 'AVAXBTC',
    // 'TRXBTC',
    // 'LINKBTC'
    'ETHBTC', 
    'BNBBTC', 
    'ADABTC',
    'MATICBTC', 
    'XRPBTC', 
    'VETBTC',
    'LINKBTC',
    'ETCBTC', 
    'XVGBTC', 
    'EOSBTC',
    'XLMBTC',
    'UNIBTC',
    'TRXBTC',
  ]
};

const historyMode: Mode = {
  ...altMode,
  start: new Date(Date.UTC(2016, 5, 1)),
  end: new Date(Date.UTC(2020, 3, 1)),
  getFileName: (symbol: string) => `/data/history/${symbol}-1h-historical-data.bin`,
  symbols: ['BTCUSDT', 'ETHUSDT']
};

const verifyMode: Mode = {
  ...altMode,
  capital: 4806.95386288,
  start: new Date(Date.UTC(2021, 6, 23, 22)),
  end: new Date(Date.UTC(2021, 7, 26, 14)),
  interval: '1h',
  dataInterval: '1h',
  simulationInterval: '1h',
  //getFileName: (symbol: string) => `/data/cache/${symbol}-1h-futures-binance-data.bin`,
  getFileName: (symbol: string) => `/data/cache/${symbol}-1h-futures-ftx-data.bin`,
  // symbols: [
  //   'ADAUSDT',
  //   'BNBUSDT',
  //   'BTCUSDT',
  //   'DOGEUSDT',
  //   'ETCUSDT',
  //   'ETHUSDT',
  //   'FILUSDT',
  //   'LINKUSDT',
  //   'TRXUSDT',
  //   'UNIUSDT',
  //   'VETUSDT'
  // ],
  symbols: [
    'ADAUSDT',
    'BNBUSDT',
    'BTCUSDT',
    'DOGEUSDT',
    'ETCUSDT',
    'ETHUSDT',
    'FILUSDT',
    'LINKUSDT',
    'TRXUSDT',
    'UNIUSDT',
    'VETUSDT'
  ].map(symbol => symbol.replace('USDT', '-PERP')),
  verboseLogger: true
};

export const modes: {[key: string]: Mode} = {
  forex: forexMode,
  alts: altMode,
  history: historyMode,
  verify: verifyMode,
  spot: spotMode,
  btc: btcMode,
  commodities: commodityMode,
  all: allMode
};

export const getSettings = (mode: Mode): Settings => ({
  interval: mode.interval,
  fee: mode.fee,
  leverage: mode.leverage,
  maxCost: mode.maxCost,
  minBalance: mode.minBalance,
  maxCandlesToBuy: 1,
  risk: mode.risk,
  fixedProfit: 0,
  maxPositions: 6,
  directions: ['long', 'short']
});

export const getSimSettings = (mode: Mode): SimulationSettings => ({
  capital: mode.capital,
  start: mode.start,
  end: mode.end,
  dataInterval: mode.dataInterval,
  simulationInterval: mode.simulationInterval,
  fundingFee: mode.fundingFee,
  slippage: mode.slippage,
  symbols: mode.symbols
});