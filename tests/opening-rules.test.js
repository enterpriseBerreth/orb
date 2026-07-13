import test from 'node:test';
import assert from 'node:assert/strict';
import { isUsOpeningHour } from '../src/core/market-session.js';
import { MarketScanner } from '../src/scanner/scanner.js';
test('permits only the first hour after the US equities open', () => {
  assert.equal(isUsOpeningHour(new Date('2026-07-13T13:30:00.000Z')), true); // 09:30 ET
  assert.equal(isUsOpeningHour(new Date('2026-07-13T14:30:00.000Z')), false); // 10:30 ET
  assert.equal(isUsOpeningHour(new Date('2026-07-11T13:30:00.000Z')), false); // Saturday
});
test('scanner retains only the 10 highest volatility candidates', () => {
  const candidates = Array.from({ length: 12 }, (_, i) => ({ symbol: `S${i}`, expectedVolatility: i, relativeVolume: 2, volume: 2000, liquidity: 'high' }));
  const ranked = new MarketScanner({ topN: 10 }).rank(candidates);
  assert.equal(ranked.length, 10); assert.equal(ranked[0].symbol, 'S11'); assert.equal(ranked.at(-1).symbol, 'S2');
});
