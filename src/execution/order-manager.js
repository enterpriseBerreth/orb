export class OrderManager {
  constructor({ broker, risk, journal }) { Object.assign(this, { broker, risk, journal }); }
  execute(signal) {
    const decision = this.risk.approve(signal, this.broker.account());
    if (!decision.approved) return this.journal.record('signal_rejected', { signal, reason: decision.reason });
    const fill = this.broker.submit({ ...signal, quantity: decision.quantity, orderType: 'market' });
    this.journal.record('order_filled', { order: fill }); return fill;
  }
}
