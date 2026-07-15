import { Broker } from './broker.js';

export class AlpacaPaperBroker extends Broker {
  constructor({ apiKey, apiSecret, baseUrl, fetchFn = globalThis.fetch, pollMs = 500, maxPolls = 20 }) {
    super(); Object.assign(this, { apiKey, apiSecret, baseUrl, fetchFn, pollMs, maxPolls }); this.usesNativeBrackets = true; this.orders = []; this.openPositions = new Map(); this.lastAccount = { realizedPnl: 0, openPositions: 0, openRisk: 0, capital: 0 };
  }
  headers() { return { 'APCA-API-KEY-ID': this.apiKey, 'APCA-API-SECRET-KEY': this.apiSecret, 'content-type': 'application/json' }; }
  async request(path, options = {}) {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, { ...options, headers: { ...this.headers(), ...options.headers } });
    if (!response.ok) throw new Error(`Alpaca paper API failed (${response.status})`);
    return response.json();
  }
  async account() {
    const account = await this.request('/v2/account');
    this.lastAccount = { realizedPnl: Number(account.equity) - Number(account.last_equity), openPositions: this.openPositions.size, openRisk: 0, openCorrelationGroups: [...this.openPositions.values()].map((position) => position.correlationGroup).filter(Boolean), capital: Number(account.equity), buyingPower: Number(account.buying_power) };
    return this.lastAccount;
  }
  hasOpenPosition(symbol) { return this.openPositions.has(symbol); }
  async submit(order) {
    const capitalBefore = (await this.account()).capital;
    const bracket = order.exitPlan ? { order_class: 'bracket', take_profit: { limit_price: String(order.exitPlan.targetPrice) }, stop_loss: { stop_price: String(order.exitPlan.stopPrice) } } : {};
    const submitted = await this.request('/v2/orders', { method: 'POST', body: JSON.stringify({ symbol: order.symbol, qty: String(order.quantity), side: order.side, type: 'market', time_in_force: 'day', client_order_id: crypto.randomUUID(), ...bracket }) });
    const filled = await this.waitForTerminalOrder(submitted.id);
    if (filled.status !== 'filled') throw new Error(`Alpaca order ${filled.id} ended as ${filled.status}`);
    const actualPrice = Number(filled.filled_avg_price); const fill = { ...order, id: filled.id, status: 'filled', quantity: Number(filled.filled_qty), price: actualPrice, capitalBefore, filledAt: filled.filled_at, fillQuality: { decisionPrice: order.price, fillPrice: actualPrice, slippage: Number((actualPrice - order.price).toFixed(4)), slippageBps: Number((((actualPrice - order.price) / order.price) * 10_000).toFixed(2)) } };
    this.orders.unshift(fill); this.openPositions.set(fill.symbol, fill); await this.account(); return fill;
  }
  async reconcileExits() {
    const closed = [];
    for (const entry of [...this.openPositions.values()]) {
      const parent = await this.request(`/v2/orders/${entry.id}?nested=true`);
      const exit = parent.legs?.find((leg) => leg.status === 'filled');
      if (!exit) continue;
      const exitPrice = Number(exit.filled_avg_price); const direction = entry.side === 'buy' ? 1 : -1;
      const realizedPnl = Number(((exitPrice - entry.price) * entry.quantity * direction).toFixed(2));
      this.openPositions.delete(entry.symbol); const capitalAfter = (await this.account()).capital;
      const notes = exit.type === 'stop' ? 'Broker-native volatility stop filled.' : 'Broker-native profit target filled.';
      const trade = { ...entry, stockName: entry.symbol, exitPrice, realizedPnl, capitalAfter, status: 'closed', closedAt: exit.filled_at ?? new Date().toISOString(), notes, closeOrderId: exit.id };
      this.orders.unshift(trade); closed.push(trade);
    }
    return closed;
  }
  async close(symbol, exitPrice, notes = '') {
    const entry = this.openPositions.get(symbol);
    if (!entry) return null;
    const capitalBefore = (await this.account()).capital;
    const order = await this.request(`/v2/positions/${encodeURIComponent(symbol)}`, { method: 'DELETE' });
    const filled = await this.waitForTerminalOrder(order.id);
    if (filled.status !== 'filled') throw new Error(`Alpaca close ${filled.id} ended as ${filled.status}`);
    const actualExit = Number(filled.filled_avg_price ?? exitPrice);
    const direction = entry.side === 'buy' ? 1 : -1;
    const realizedPnl = Number(((actualExit - entry.price) * entry.quantity * direction).toFixed(2));
    this.openPositions.delete(symbol); const capitalAfter = (await this.account()).capital;
    const trade = { ...entry, stockName: symbol, exitPrice: actualExit, realizedPnl, capitalBefore, capitalAfter, notes, status: 'closed', closedAt: filled.filled_at ?? new Date().toISOString(), closeOrderId: filled.id };
    this.orders.unshift(trade); return trade;
  }
  async waitForTerminalOrder(id) {
    for (let attempt = 0; attempt < this.maxPolls; attempt += 1) {
      const order = await this.request(`/v2/orders/${id}`);
      if (['filled', 'canceled', 'rejected', 'expired'].includes(order.status)) return order;
      await new Promise((resolve) => setTimeout(resolve, this.pollMs));
    }
    throw new Error(`Alpaca order ${id} did not reach a terminal state`);
  }
  status() { return { mode: 'alpaca-paper', account: this.lastAccount, orders: this.orders.slice(0, 20), positions: [...this.openPositions.values()] }; }
}
