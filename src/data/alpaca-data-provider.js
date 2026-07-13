import { MarketDataProvider } from './market-data-provider.js';

export class AlpacaDataProvider extends MarketDataProvider {
  constructor({ apiKey, apiSecret, feed = 'iex', fetchFn = globalThis.fetch }) { super(); Object.assign(this, { apiKey, apiSecret, feed, fetchFn }); }
  headers() { return { 'APCA-API-KEY-ID': this.apiKey, 'APCA-API-SECRET-KEY': this.apiSecret }; }
  async getSnapshot(symbols) {
    const url = `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${encodeURIComponent(symbols.join(','))}&feed=${this.feed}`;
    const response = await this.fetchFn(url, { headers: this.headers() });
    if (!response.ok) throw new Error(`Alpaca market data failed (${response.status})`);
    const snapshots = await response.json();
    return Object.entries(snapshots).flatMap(([symbol, snapshot]) => {
      const price = Number(snapshot.latestTrade?.p ?? snapshot.minuteBar?.c);
      const previousClose = Number(snapshot.prevDailyBar?.c);
      const volume = Number(snapshot.dailyBar?.v ?? snapshot.minuteBar?.v ?? 0);
      if (!Number.isFinite(price) || !price) return [];
      const premarketGapPercent = previousClose ? ((price - previousClose) / previousClose) * 100 : 0;
      // Daily volume is intentionally a conservative proxy until premarket-volume data is added.
      const relativeVolume = Math.max(1, Number((volume / Math.max(1, snapshot.prevDailyBar?.v ?? volume) * 100).toFixed(2)));
      return [{ symbol, price, volume, relativeVolume, premarketGapPercent: Number(premarketGapPercent.toFixed(2)), expectedVolatility: Number((Math.abs(premarketGapPercent) * relativeVolume).toFixed(2)), liquidity: snapshot.latestQuote ? 'high' : 'unknown', timestamp: snapshot.latestTrade?.t ?? new Date().toISOString() }];
    });
  }
  async getBars(symbol, count = 30) {
    const url = `https://data.alpaca.markets/v2/stocks/${encodeURIComponent(symbol)}/bars?timeframe=1Min&limit=${count}&feed=${this.feed}`;
    const response = await this.fetchFn(url, { headers: this.headers() });
    if (!response.ok) throw new Error(`Alpaca bars failed (${response.status})`);
    const { bars = [] } = await response.json();
    return bars.map((bar) => ({ symbol, open: bar.o, high: bar.h, low: bar.l, close: bar.c, volume: bar.v, timestamp: bar.t }));
  }
}
