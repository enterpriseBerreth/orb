import { evaluateOrb } from '../strategies/orb.js';
import { passesFilters } from '../filters/signal-filter.js';
export class TradingBot {
  constructor({ feed, scanner, orderManager, journal }) { Object.assign(this, { feed, scanner, orderManager, journal }); this.ranges = new Map(); this.lastScan = []; }
  async cycle() {
    const ranked = this.scanner.rank(await this.feed.getSnapshot()); this.lastScan = ranked;
    for (const market of ranked) {
      const range = this.ranges.get(market.symbol) ?? { high: market.price * 1.0002, low: market.price * 0.9998 };
      this.ranges.set(market.symbol, range);
      const signal = evaluateOrb({ ...market, openingRange: range });
      if (passesFilters(signal, market)) this.orderManager.execute(signal);
    }
    this.journal.record('scan_complete', { candidates: ranked.length }); return ranked;
  }
}
