const easternDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(date);
export class PortfolioManager {
  constructor({ initialCapital = 10_000, onChange } = {}) { this.positions = new Map(); this.closedPnl = 0; this.initialCapital = initialCapital; this.tradeHistory = []; this.onChange = onChange; }
  hydrate(state) { if (!state) return this.snapshot(); this.closedPnl = Number(state.closedPnl ?? 0); this.initialCapital = Number(state.initialCapital ?? this.initialCapital); this.positions = new Map((state.positions ?? []).map((position) => [position.symbol, position])); this.tradeHistory = state.tradeHistory ?? []; return this.snapshot(); }
  state() { return { initialCapital: this.initialCapital, closedPnl: this.closedPnl, positions: [...this.positions.values()], tradeHistory: this.tradeHistory.slice(0, 100) }; }
  changed() { this.onChange?.(this.state()); return this.snapshot(); }
  applyFill(fill) {
    const existing = this.positions.get(fill.symbol);
    if (!existing) this.positions.set(fill.symbol, { symbol: fill.symbol, side: fill.side, quantity: fill.quantity, averagePrice: fill.price, stopPrice: fill.stopPrice });
    return this.changed();
  }
  applyClosedTrade(trade) {
    if (this.positions.has(trade.symbol)) return this.close(trade.symbol, trade.exitPrice);
    this.closedPnl += Number(trade.realizedPnl ?? 0); this.tradeHistory.unshift(trade); this.tradeHistory = this.tradeHistory.slice(0, 100);
    return this.changed();
  }
  close(symbol, exitPrice) {
    const position = this.positions.get(symbol);
    if (!position) return null;
    const direction = position.side === 'buy' ? 1 : -1;
    const pnl = (exitPrice - position.averagePrice) * position.quantity * direction;
    this.closedPnl += pnl; this.positions.delete(symbol);
    const trade = { ...position, exitPrice, realizedPnl: Number(pnl.toFixed(2)), closedAt: new Date().toISOString() };
    this.tradeHistory.unshift(trade); this.tradeHistory = this.tradeHistory.slice(0, 100); this.changed(); return trade;
  }
  exposure() { return [...this.positions.values()].reduce((total, p) => total + Math.abs(p.averagePrice * p.quantity), 0); }
  snapshot() { const todayTrades = this.tradeHistory.filter((trade) => easternDate(new Date(trade.closedAt)) === easternDate()); let consecutiveLosses = 0; for (const trade of this.tradeHistory) { if (trade.realizedPnl < 0) consecutiveLosses += 1; else break; } return { initialCapital: this.initialCapital, capital: Number((this.initialCapital + this.closedPnl).toFixed(2)), realizedPnl: Number(this.closedPnl.toFixed(2)), dailyPnl: Number(todayTrades.reduce((sum, trade) => sum + trade.realizedPnl, 0).toFixed(2)), consecutiveLosses, openPositions: this.positions.size, exposure: this.exposure(), positions: [...this.positions.values()] }; }
}
