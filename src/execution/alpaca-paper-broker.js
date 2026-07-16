import { Broker } from './broker.js';

export class AlpacaPaperBroker extends Broker {
  constructor({ apiKey, apiSecret, baseUrl, portfolio, estimatedFeesBps = 1, fetchFn = globalThis.fetch, pollMs = 500, maxPolls = 20, maxFailures = 3, retryCooldownMs = 300000 }) {
    super(); Object.assign(this, { apiKey, apiSecret, baseUrl, portfolio, estimatedFeesBps, fetchFn, pollMs, maxPolls, maxFailures, retryCooldownMs }); this.usesNativeBrackets = true; this.orders = []; this.openPositions = new Map(); this.consecutiveFailures = 0; this.unavailableUntil = 0; this.lastError = null; this.lastAccount = { realizedPnl: 0, openPositions: 0, openRisk: 0, capital: portfolio?.snapshot().capital ?? 0 };
  }
  headers() { return { 'APCA-API-KEY-ID': this.apiKey, 'APCA-API-SECRET-KEY': this.apiSecret, 'content-type': 'application/json' }; }
  async request(path, options = {}) {
    if (Date.now() < this.unavailableUntil) throw new Error(`Broker circuit open until ${new Date(this.unavailableUntil).toISOString()}`);
    const response = await this.fetchFn(`${this.baseUrl}${path}`, { ...options, headers: { ...this.headers(), ...options.headers } });
    if (!response.ok) {
      this.consecutiveFailures += 1; this.lastError = `Alpaca paper API failed (${response.status})`;
      if (response.status === 403 || this.consecutiveFailures >= this.maxFailures) this.unavailableUntil = Date.now() + this.retryCooldownMs;
      throw new Error(this.lastError);
    }
    this.consecutiveFailures = 0; this.lastError = null;
    return response.json();
  }
  async account() {
    const account = await this.request('/v2/account');
    const virtual = this.portfolio?.snapshot();
    this.lastAccount = { realizedPnl: virtual?.dailyPnl ?? 0, consecutiveLosses: virtual?.consecutiveLosses ?? this.consecutiveLosses(), openPositions: this.openPositions.size, openRisk: 0, openCorrelationGroups: [...this.openPositions.values()].map((position) => position.correlationGroup).filter(Boolean), capital: virtual?.capital ?? Number(account.equity), buyingPower: virtual?.capital ?? Number(account.buying_power), brokerEquity: Number(account.equity), virtualCapital: true };
    return this.lastAccount;
  }
  hasOpenPosition(symbol) { return this.openPositions.has(symbol); }
  isAvailable() { return Date.now() >= this.unavailableUntil; }
  consecutiveLosses() { let count = 0; for (const order of this.orders) { if (order.status !== 'closed') continue; if ((order.realizedPnl ?? 0) < 0) count += 1; else break; } return count; }
  async discoverBrokerPositions() {
    const positions = await this.request('/v2/positions');
    for (const position of positions) {
      if (this.openPositions.has(position.symbol)) continue;
      this.openPositions.set(position.symbol, { symbol: position.symbol, side: Number(position.qty) >= 0 ? 'buy' : 'sell', quantity: Math.abs(Number(position.qty)), price: Number(position.avg_entry_price), filledAt: new Date().toISOString(), exitPlan: { maxHoldMinutes: 0 }, recovered: true });
    }
    return [...this.openPositions.values()];
  }
  async submit(order) {
    const capitalBefore = (await this.account()).capital;
    const bracket = order.exitPlan ? { order_class: 'bracket', take_profit: { limit_price: String(order.exitPlan.targetPrice) }, stop_loss: { stop_price: String(order.exitPlan.stopPrice) } } : {};
    const submittedAt = new Date().toISOString(); const submitted = await this.request('/v2/orders', { method: 'POST', body: JSON.stringify({ symbol: order.symbol, qty: String(order.quantity), side: order.side, type: 'market', time_in_force: 'day', client_order_id: crypto.randomUUID(), ...bracket }) });
    const filled = await this.waitForTerminalOrder(submitted.id);
    if (filled.status !== 'filled') throw new Error(`Alpaca order ${filled.id} ended as ${filled.status}`);
    const actualPrice = Number(filled.filled_avg_price); const filledAt = filled.filled_at ?? new Date().toISOString(); const notional = actualPrice * Number(filled.filled_qty);
    const fill = { ...order, id: filled.id, status: 'filled', quantity: Number(filled.filled_qty), price: actualPrice, capitalBefore, submittedAt, filledAt, fillQuality: { decisionPrice: order.price, fillPrice: actualPrice, bid: order.bid ?? null, ask: order.ask ?? null, quotedSpreadBps: order.spreadBps ?? null, slippage: Number((actualPrice - order.price).toFixed(4)), slippageBps: Number((((actualPrice - order.price) / order.price) * 10_000).toFixed(2)), estimatedEntryFee: Number((notional * this.estimatedFeesBps / 10_000).toFixed(4)), orderToFillMs: Math.max(0, new Date(filledAt) - new Date(submittedAt)) } };
    this.orders.unshift(fill); this.openPositions.set(fill.symbol, fill); this.portfolio?.applyFill(fill); await this.account(); return fill;
  }
  async reconcileExits() {
    const closed = [];
    for (const entry of [...this.openPositions.values()]) {
      if (!entry.id) continue;
      const parent = await this.request(`/v2/orders/${entry.id}?nested=true`);
      const exit = parent.legs?.find((leg) => leg.status === 'filled');
      if (!exit) continue;
      const exitPrice = Number(exit.filled_avg_price); const direction = entry.side === 'buy' ? 1 : -1;
      const realizedPnl = Number(((exitPrice - entry.price) * entry.quantity * direction).toFixed(2));
      this.openPositions.delete(entry.symbol); this.portfolio?.close(entry.symbol, exitPrice); const capitalAfter = this.portfolio?.snapshot().capital ?? (await this.account()).capital;
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
    this.openPositions.delete(symbol); this.portfolio?.close(symbol, actualExit); const capitalAfter = this.portfolio?.snapshot().capital ?? (await this.account()).capital;
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
  async verifyBracket(position) {
    const parent = await this.request(`/v2/orders/${position.id}?nested=true`);
    const activeLegs = parent.legs?.filter((leg) => ['new', 'accepted', 'pending_new', 'held'].includes(leg.status)) ?? [];
    return { active: activeLegs.length >= 2, parent };
  }
  async emergencyFlattenAll(reason = 'Emergency safety flatten.') {
    const closed = [];
    for (const position of [...this.openPositions.values()]) { const trade = await this.close(position.symbol, position.price, reason); if (trade) closed.push(trade); }
    return closed;
  }
  status() { return { mode: 'alpaca-paper', account: this.lastAccount, health: { consecutiveFailures: this.consecutiveFailures, unavailableUntil: this.unavailableUntil ? new Date(this.unavailableUntil).toISOString() : null, lastError: this.lastError }, orders: this.orders.slice(0, 20), positions: [...this.openPositions.values()] }; }
}
