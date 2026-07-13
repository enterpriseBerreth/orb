import test from 'node:test';
import assert from 'node:assert/strict';
import { AlpacaPaperBroker } from '../src/execution/alpaca-paper-broker.js';
test('submits and records a filled Alpaca paper order', async () => {
  const fetchFn = async (url, options = {}) => ({ ok: true, json: async () => url.endsWith('/v2/account') ? { equity: '1000', last_equity: '1000', buying_power: '2000' } : options.method === 'POST' ? { id: 'order-1' } : { id: 'order-1', status: 'filled', filled_qty: '2', filled_avg_price: '100', filled_at: '2026-01-01T00:00:00Z' } });
  const broker = new AlpacaPaperBroker({ apiKey: 'key', apiSecret: 'secret', baseUrl: 'https://paper-api.alpaca.markets', fetchFn, pollMs: 0 });
  const fill = await broker.submit({ symbol: 'AAPL', side: 'buy', quantity: 2, price: 99, stopPrice: 98 });
  assert.equal(fill.price, 100); assert.equal(broker.hasOpenPosition('AAPL'), true);
});
