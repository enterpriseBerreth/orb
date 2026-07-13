import { evaluateOrb } from '../strategies/orb.js';
import { passesFilters } from '../filters/signal-filter.js';
import { isUsOpeningHour } from './market-session.js';
export class TradingBot {
  constructor({ feed, scanner, orderManager, journal, tradeCandidates = 3, marketOpenCheck = isUsOpeningHour }) { Object.assign(this, { feed, scanner, orderManager, journal, tradeCandidates, marketOpenCheck }); this.ranges = new Map(); this.lastScan = []; }
  async cycle(date = new Date()) {
    const ranked = this.scanner.rank(await this.feed.getSnapshot()); this.lastScan = ranked;
    if (!this.marketOpenCheck(date)) {
      this.journal.record('scan_complete', { candidates: ranked.length, entriesAllowed: false, reason: 'outside-us-opening-hour' });
      return ranked;
    }
    for (const market of ranked.slice(0, this.tradeCandidates)) {
      const range = this.ranges.get(market.symbol) ?? { high: market.price * 1.0002, low: market.price * 0.9998 };
      this.ranges.set(market.symbol, range);
      const signal = evaluateOrb({ ...market, openingRange: range });
      if (passesFilters(signal, market)) this.orderManager.execute(signal);
    }
    this.journal.record('scan_complete', { candidates: ranked.length, focusedCandidates: Math.min(ranked.length, this.tradeCandidates), entriesAllowed: true }); return ranked;
  }
}
