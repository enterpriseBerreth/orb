import { Broker } from './broker.js';

// Boundary for a futures broker SDK. This is intentionally not wired by default.
export class LiveBrokerAdapter extends Broker {
  constructor(client) { super(); this.client = client; }
  async account() { return this.client.account(); }
  async submit(order) { return this.client.submitOrder(order); }
  async cancel(orderId) { return this.client.cancelOrder(orderId); }
  async positions() { return this.client.positions(); }
}
