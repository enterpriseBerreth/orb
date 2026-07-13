import { MarketDataProvider } from './market-data-provider.js';
const bases = { NVDA: 175, TSLA: 320, AMD: 155, MSFT: 500, AAPL: 210, META: 720, AMZN: 230, GOOGL: 190, NFLX: 1200, COIN: 350, PLTR: 150, SMCI: 45 };
export class SimulatedMarketDataFeed extends MarketDataProvider {
  constructor(symbols) { super(); this.symbols = symbols; this.prices = new Map(symbols.map((s) => [s, bases[s] ?? 100])); }
  snapshot() {
    return this.symbols.map((symbol) => {
      const prior = this.prices.get(symbol);
      const price = Number((prior * (1 + ((Math.random() - 0.5) * 0.001))).toFixed(2));
      this.prices.set(symbol, price);
      const relativeVolume = Number((0.7 + Math.random() * 2).toFixed(2));
      const premarketGapPercent = Number(((Math.random() - 0.35) * 12).toFixed(2));
      return { symbol, price, volume: Math.floor(500 + Math.random() * 3000), relativeVolume, premarketGapPercent, expectedVolatility: Number((Math.abs(premarketGapPercent) * relativeVolume).toFixed(2)), liquidity: 'high', timestamp: new Date().toISOString() };
    });
  }
  async getSnapshot() { return this.snapshot(); }
  async getBars(symbol, count = 30) {
    const end = this.prices.get(symbol) ?? bases[symbol] ?? 100;
    return Array.from({ length: count }, (_, index) => {
      const close = Number((end * (1 + ((index - count) * 0.0002))).toFixed(2));
      return { symbol, open: close - 0.25, high: close + 0.5, low: close - 0.5, close, volume: 1000 + index * 10, timestamp: new Date(Date.now() - (count - index) * 60_000).toISOString() };
    });
  }
}
