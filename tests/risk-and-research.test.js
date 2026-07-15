import test from 'node:test';
import assert from 'node:assert/strict';
import { RiskManager } from '../src/risk/risk-manager.js';
import { buildExitPlan } from '../src/risk/exit-plan.js';
import { executionCost } from '../src/backtesting/cost-model.js';
import { evaluatePaperReadiness } from '../src/backtesting/research-gate.js';
test('sizes risk at one percent of a 1000-dollar research account', () => {
  const decision = new RiskManager({ maxDailyLoss: 500, maxOpenPositions: 3, riskPerTradePercent: 1, initialCapital: 1000 }).approve({ price: 100, stopPrice: 99 }, { capital: 1000, realizedPnl: 0, openPositions: 0 });
  assert.equal(decision.riskBudget, 10); assert.equal(decision.quantity, 10);
});
test('builds a volatility-aware bracket exit plan', () => {
  const plan = buildExitPlan({ side: 'buy', price: 100, stopPrice: 99 }, { atr: 2 }, { stopAtrMultiplier: 1, targetRMultiple: 1.5 });
  assert.equal(plan.stopPrice, 98); assert.equal(plan.targetPrice, 103);
});
test('adds spread, slippage and fees to research costs', () => assert.ok(executionCost({ notional: 1000, quantity: 10 }) > 0));
test('blocks live eligibility without sufficient validated evidence', () => assert.equal(evaluatePaperReadiness({ totalTrades: 10, netPnl: 20, profitableFolds: 1, folds: 1 }).eligibleForLiveTrading, false));
