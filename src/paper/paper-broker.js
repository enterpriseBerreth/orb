import { Broker } from '../execution/broker.js';
export class PaperBroker extends Broker {
  constructor({ portfolio } = {}) { super(); this.orders = []; this.openPositions = new Map(); this.realizedPnl = 0; this.portfolio = portfolio; }
  account() { const state = this.portfolio?.snapshot(); return { realizedPnl: state?.realizedPnl ?? this.realizedPnl, openPositions: state?.openPositions ?? this.openPositions.size, openRisk: 0 }; }
  submit(order) {
    const fill = { ...order, id: crypto.randomUUID(), status: 'filled', filledAt: new Date().toISOString() };
    this.orders.unshift(fill); this.openPositions.set(order.symbol, fill); this.portfolio?.applyFill(fill); return fill;
  }
  cancel(orderId) { return { id: orderId, status: 'cancelled' }; }
  positions() { return [...this.openPositions.values()]; }
  status() { return { mode: 'paper', account: this.account(), orders: this.orders.slice(0, 20), positions: this.positions() }; }
}
