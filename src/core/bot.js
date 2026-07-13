import { evaluateOrb } from '../strategies/orb.js';
import { passesFilters } from '../filters/signal-filter.js';
import { easternTradingDate, isUsOpeningHour, usMarketSessionPhase } from './market-session.js';
export class TradingBot {
  constructor({ feed, scanner, orderManager, journal, notifier, tradeCandidates = 3, breakoutBufferPercent = 0.05, marketOpenCheck = isUsOpeningHour }) { Object.assign(this, { feed, scanner, orderManager, journal, notifier, tradeCandidates, breakoutBufferPercent, marketOpenCheck }); this.ranges = new Map(); this.lastScan = []; this.rangeDate = null; }
  async cycle(date = new Date()) {
    const ranked = this.scanner.rank(await this.feed.getSnapshot()); this.lastScan = ranked;
    const phase = usMarketSessionPhase(date); const tradingDate = easternTradingDate(date);
    if (phase === 'building-opening-range') {
      if (this.rangeDate !== tradingDate) { this.ranges.clear(); this.rangeDate = tradingDate; }
      for (const market of ranked) {
        const range = this.ranges.get(market.symbol) ?? { high: market.price, low: market.price };
        range.high = Math.max(range.high, market.price); range.low = Math.min(range.low, market.price); this.ranges.set(market.symbol, range);
      }
      this.journal.record('opening_range_update', { candidates: ranked.length, rangeDate: tradingDate }); return ranked;
    }
    for (const market of ranked) {
      const position = this.orderManager.broker.openPositions.get(market.symbol);
      if (!position) continue;
      const stopped = position.side === 'buy' ? market.price <= position.stopPrice : market.price >= position.stopPrice;
      const target = position.side === 'buy' ? market.price >= position.price + (position.price - position.stopPrice) : market.price <= position.price - (position.stopPrice - position.price);
      if (stopped || target) {
        const notes = stopped ? 'Stopped out at the defined risk level.' : 'Exited at a one-to-one risk/reward target.';
        const trade = await this.orderManager.close(market.symbol, market.price, notes);
        if (trade) await this.notifier?.sendTradeExit(trade);
      }
    }
    if (!this.marketOpenCheck(date)) {
      this.journal.record('scan_complete', { candidates: ranked.length, entriesAllowed: false, reason: 'outside-us-opening-hour' });
      return ranked;
    }
    for (const market of ranked.slice(0, this.tradeCandidates)) {
      const range = this.rangeDate === tradingDate ? this.ranges.get(market.symbol) : null;
      const signal = evaluateOrb({ ...market, openingRange: range, breakoutBufferPercent: this.breakoutBufferPercent });
      if (passesFilters(signal, market)) await this.orderManager.execute(signal);
    }
    this.journal.record('scan_complete', { candidates: ranked.length, focusedCandidates: Math.min(ranked.length, this.tradeCandidates), entriesAllowed: true, openingRangeReady: this.rangeDate === tradingDate }); return ranked;
  }
}
