import test from 'node:test';
import assert from 'node:assert/strict';
import { AlpacaDataProvider } from '../src/data/alpaca-data-provider.js';
test('maps an Alpaca snapshot into a scanner candidate', async () => {
  const provider = new AlpacaDataProvider({ apiKey: 'key', apiSecret: 'secret', fetchFn: async () => ({ ok: true, json: async () => ({ AAPL: { latestTrade: { p: 110, t: '2026-01-01T00:00:00Z' }, latestQuote: { bp: 109, ap: 110 }, dailyBar: { v: 200 }, prevDailyBar: { c: 100, v: 100 } } }) }) });
  const [candidate] = await provider.getSnapshot(['AAPL']);
  assert.equal(candidate.price, 110); assert.equal(candidate.premarketGapPercent, 10); assert.equal(candidate.liquidity, 'high');
});
