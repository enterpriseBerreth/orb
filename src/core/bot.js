import { evaluateOrb } from '../strategies/orb.js';
import { passesFilters } from '../filters/signal-filter.js';
import { isUsOpeningHour } from './market-session.js';
export class TradingBot {
  constructor({ feed, scanner, orderManager, journal, notifier, tradeCandidates = 3, marketOpenCheck = isUsOpeningHour }) { Object.assign(this, { feed, scanner, orderManager, journal, notifier, tradeCandidates, marketOpenCheck }); this.ranges = new Map(); this.lastScan = []; }
  async cycle(date = new Date()) {
    const ranked = this.scanner.rank(await this.feed.getSnapshot()); this.lastScan = ranked;
    for (const market of ranked) {
      const position = this.orderManager.broker.openPositions.get(market.symbol);
      if (!position) continue;
      const stopped = position.side === 'buy' ? market.price <= position.stopPrice : market.price >= position.stopPrice;
      const target = position.side === 'buy' ? market.price >= position.price + (position.price - position.stopPrice) : market.price <= position.price - (position.stopPrice - position.price);
      if (stopped || target) {
        const notes = stopped ? 'Stopped out at the defined risk level.' : 'Exited at a one-to-one risk/reward target.';
        const trade = this.orderManager.close(market.symbol, market.price, notes);
        if (trade) await this.notifier?.sendTradeExit(trade);
      }
    }
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
