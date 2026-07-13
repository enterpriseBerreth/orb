export class OrderManager {
  constructor({ broker, risk, journal }) { Object.assign(this, { broker, risk, journal }); }
  async execute(signal) {
    if (this.broker.hasOpenPosition?.(signal.symbol)) return this.journal.record('signal_rejected', { signal, reason: 'existing-symbol-position' });
    const decision = this.risk.approve(signal, await this.broker.account());
    if (!decision.approved) return this.journal.record('signal_rejected', { signal, reason: decision.reason });
    const fill = await this.broker.submit({ ...signal, quantity: decision.quantity, orderType: 'market' });
    this.journal.record('order_filled', { order: fill }); return fill;
  }
  async close(symbol, exitPrice, notes) {
    const trade = await this.broker.close(symbol, exitPrice, notes);
    if (trade) this.journal.record('position_closed', { trade });
    return trade;
  }
}
