import { MarketDataProvider } from './market-data-provider.js';

// Implement this adapter with a licensed futures market-data vendor.
export class LiveDataAdapter extends MarketDataProvider {
  constructor(client) { super(); this.client = client; }
  async getSnapshot(symbols) { return this.client.getSnapshot(symbols); }
  async getBars(symbol, count) { return this.client.getBars(symbol, count); }
}
