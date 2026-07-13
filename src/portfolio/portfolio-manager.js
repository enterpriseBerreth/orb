export class PortfolioManager {
  constructor({ initialCapital = 10_000 } = {}) { this.positions = new Map(); this.closedPnl = 0; this.initialCapital = initialCapital; }
  applyFill(fill) {
    const existing = this.positions.get(fill.symbol);
    if (!existing) this.positions.set(fill.symbol, { symbol: fill.symbol, side: fill.side, quantity: fill.quantity, averagePrice: fill.price, stopPrice: fill.stopPrice });
    return this.snapshot();
  }
  close(symbol, exitPrice) {
    const position = this.positions.get(symbol);
    if (!position) return null;
    const direction = position.side === 'buy' ? 1 : -1;
    const pnl = (exitPrice - position.averagePrice) * position.quantity * direction;
    this.closedPnl += pnl; this.positions.delete(symbol);
    return { ...position, exitPrice, realizedPnl: Number(pnl.toFixed(2)) };
  }
  exposure() { return [...this.positions.values()].reduce((total, p) => total + Math.abs(p.averagePrice * p.quantity), 0); }
  snapshot() { return { initialCapital: this.initialCapital, capital: Number((this.initialCapital + this.closedPnl).toFixed(2)), realizedPnl: Number(this.closedPnl.toFixed(2)), openPositions: this.positions.size, exposure: this.exposure(), positions: [...this.positions.values()] }; }
}
