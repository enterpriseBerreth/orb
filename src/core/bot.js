import { evaluateOrb, hasConfirmedOrbBreak } from '../strategies/orb.js';
import { passesFilters } from '../filters/signal-filter.js';
import { easternTradingDate, isUsOpeningHour, usMarketSessionPhase } from './market-session.js';
import { analyzeRegime } from '../research/regime-analyzer.js';
import { buildExitPlan } from '../risk/exit-plan.js';
export class TradingBot {
  constructor({ feed, scanner, orderManager, journal, persistence, notifier, tradeCandidates = 3, breakoutBufferPercent = 0.05, exitConfig = {}, marketOpenCheck = isUsOpeningHour }) { Object.assign(this, { feed, scanner, orderManager, journal, persistence, notifier, tradeCandidates, breakoutBufferPercent, exitConfig, marketOpenCheck }); this.ranges = new Map(); this.lastScan = []; this.lastUniverse = []; this.rangeDate = null; this.lastBrokerAlert = 0; this.lastClosedLogMinute = null; }
  async cycle(date = new Date()) {
    const phase = usMarketSessionPhase(date); const tradingDate = easternTradingDate(date);
    await this.manageOpenPositions(date, phase);
    if (phase === 'closed') { this.recordClosedSession(date); return []; }
    const universe = await this.feed.getSnapshot(); const ranked = this.scanner.rank(universe); this.lastUniverse = universe; this.lastScan = ranked;
    if (phase === 'building-opening-range') {
      if (this.rangeDate !== tradingDate) { this.ranges.clear(); this.rangeDate = tradingDate; }
      for (const market of universe) {
        const range = this.ranges.get(market.symbol) ?? { high: market.price, low: market.price };
        range.high = Math.max(range.high, market.price); range.low = Math.min(range.low, market.price); this.ranges.set(market.symbol, range);
        await this.persistence?.upsertOpeningRange(tradingDate, market.symbol, market.price);
      }
      this.journal.record('opening_range_update', { candidates: ranked.length, universeSymbols: universe.length, rangeDate: tradingDate }); return ranked;
    }
    if (!this.orderManager.broker.usesNativeBrackets) for (const market of ranked) {
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
    for (const [rank, market] of ranked.slice(0, this.tradeCandidates).entries()) {
      const range = this.rangeDate === tradingDate ? this.ranges.get(market.symbol) : await this.persistence?.getOpeningRange(tradingDate, market.symbol);
      if (!range) { this.recordSkip(market, rank + 1, 'no-opening-range', null); continue; }
      const bars = await this.feed.getBars(market.symbol, 30); const regime = analyzeRegime(market, bars, date);
      const signal = evaluateOrb({ ...market, openingRange: range, breakoutBufferPercent: this.breakoutBufferPercent });
      if (!signal) { this.recordSkip(market, rank + 1, 'no-confirmed-buffered-breakout', range); continue; }
      if (!hasConfirmedOrbBreak(signal, range, bars, this.breakoutBufferPercent, this.exitConfig.orbConfirmationBars)) { this.recordSkip(market, rank + 1, 'breakout-awaiting-multi-bar-confirmation', range); continue; }
      const exitPlan = buildExitPlan(signal, regime, this.exitConfig); const enrichedSignal = { ...signal, stopPrice: exitPlan.stopPrice, exitPlan, ...regime, bid: market.bid, ask: market.ask, spreadBps: market.spreadBps, scannerRank: rank + 1, scannerScore: market.score };
      if (!passesFilters(enrichedSignal, market, this.exitConfig)) { this.recordSkip(market, rank + 1, 'strategy-filter-rejected', range); continue; }
      const outcome = await this.orderManager.execute(enrichedSignal);
      this.journal.record('signal_evaluated', { symbol: market.symbol, rank: rank + 1, decision: outcome?.type ?? outcome?.status ?? 'submitted', signal: enrichedSignal, range, regime });
    }
    this.journal.record('scan_complete', { candidates: ranked.length, focusedCandidates: Math.min(ranked.length, this.tradeCandidates), entriesAllowed: true, openingRangeReady: this.rangeDate === tradingDate }); return ranked;
  }
  recordClosedSession(date) { const minute = Math.floor(date.getTime() / 60_000); if (minute === this.lastClosedLogMinute) return; this.lastClosedLogMinute = minute; this.journal.record('scan_complete', { candidates: 0, entriesAllowed: false, reason: 'outside-us-opening-hour' }); }
  async manageOpenPositions(date, phase) {
    const broker = this.orderManager.broker;
    if (!broker.openPositions?.size || !broker.isAvailable?.()) return;
    try {
      for (const trade of await broker.reconcileExits?.() ?? []) { this.journal.record('position_closed', { trade }); await this.notifier?.sendTradeExit(trade); }
      for (const position of [...broker.openPositions.values()]) {
        const heldMinutes = (date - new Date(position.filledAt)) / 60_000;
        const bracket = position.recovered ? { active: false } : broker.usesNativeBrackets ? await broker.verifyBracket(position) : { active: true };
        if (!bracket.active) { this.journal.record('position_safety_alert', { symbol: position.symbol, reason: 'missing-active-bracket' }); await this.notifier?.send(`ORB safety alert: ${position.symbol} has no active protective bracket.`); }
        const afterWindow = phase === 'closed' || minutesAfterOpen(date) >= this.exitConfig.emergencyFlattenMinutesAfterOpen;
        if (!bracket.active || heldMinutes >= position.exitPlan?.maxHoldMinutes || afterWindow) {
          const reason = !bracket.active ? 'Emergency exit: protective bracket missing.' : afterWindow ? 'Emergency flatten: outside permitted opening-session holding window.' : 'Emergency time stop: maximum holding period exceeded.';
          const trade = await this.orderManager.close(position.symbol, position.price, reason);
          if (trade) { this.journal.record('position_closed', { trade }); await this.notifier?.sendTradeExit(trade); }
        }
      }
    } catch (error) {
      if (Date.now() - this.lastBrokerAlert >= this.exitConfig.brokerRetryCooldownMs) { this.lastBrokerAlert = Date.now(); this.journal.record('broker_safety_error', { message: error.message }); await this.notifier?.send(`ORB broker safety alert: ${error.message}. New trade execution is paused.`); }
    }
  }
  recordSkip(market, rank, reason, range) { this.journal.record('signal_skipped', { symbol: market.symbol, rank, reason, price: market.price, score: market.score, relativeVolume: market.relativeVolume, expectedVolatility: market.expectedVolatility, range }); }
}
function minutesAfterOpen(date) { const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value])); return Number(parts.hour) * 60 + Number(parts.minute) - 570; }
