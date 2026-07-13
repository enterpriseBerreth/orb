import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateOrb } from '../src/strategies/orb.js';
import { RiskManager } from '../src/risk/risk-manager.js';
test('creates a long signal above the opening range', () => {
  const result = evaluateOrb({ symbol: 'ES', price: 101, openingRange: { high: 100, low: 95 }, relativeVolume: 1.5 });
  assert.equal(result.side, 'buy'); assert.equal(result.stopPrice, 95);
});
test('blocks orders after the daily loss limit', () => {
  const risk = new RiskManager({ maxDailyLoss: 500, maxOpenPositions: 3, riskPerTrade: 100 });
  assert.equal(risk.approve({ price: 101, stopPrice: 100 }, { realizedPnl: -500, openPositions: 0 }).approved, false);
});
