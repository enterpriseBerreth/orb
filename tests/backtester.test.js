import test from 'node:test';
import assert from 'node:assert/strict';
import { Backtester } from '../src/backtesting/backtester.js';
test('backtester returns a deterministic result envelope', () => {
  const bars = [95, 97, 98, 99, 100, 102, 104].map((close, index) => ({ symbol: 'ES', close, high: close + 1, low: close - 1, timestamp: String(index) }));
  const result = new Backtester().run(bars, { openingRangeBars: 5 });
  assert.equal(result.initialCapital, 10000); assert.ok(result.totalTrades >= 1);
});
