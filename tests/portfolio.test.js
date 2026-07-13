import test from 'node:test';
import assert from 'node:assert/strict';
import { PortfolioManager } from '../src/portfolio/portfolio-manager.js';
test('portfolio tracks and closes a long position', () => {
  const portfolio = new PortfolioManager();
  portfolio.applyFill({ symbol: 'ES', side: 'buy', quantity: 2, price: 100, stopPrice: 99 });
  const closed = portfolio.close('ES', 103);
  assert.equal(closed.realizedPnl, 6); assert.equal(portfolio.snapshot().openPositions, 0);
});
