export class MarketDataProvider {
  async getSnapshot() { throw new Error('MarketDataProvider.getSnapshot must be implemented'); }
  async getBars() { throw new Error('MarketDataProvider.getBars must be implemented'); }
}
