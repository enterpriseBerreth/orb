import { evaluateOrb } from '../strategies/orb.js';
import { executionCost } from './cost-model.js';
export class Backtester {
  constructor({ initialCapital = 10_000, riskPerTrade = 100, costs = {} } = {}) { this.initialCapital = initialCapital; this.riskPerTrade = riskPerTrade; this.costs = costs; }
  run(bars, { openingRangeBars = 5 } = {}) {
    if (bars.length <= openingRangeBars) return this.result([]);
    const rangeBars = bars.slice(0, openingRangeBars);
    const range = { high: Math.max(...rangeBars.map((bar) => bar.high)), low: Math.min(...rangeBars.map((bar) => bar.low)) };
    const trades = []; let active = null;
    for (const bar of bars.slice(openingRangeBars)) {
      if (!active) {
        const signal = evaluateOrb({ symbol: bar.symbol, price: bar.close, openingRange: range, relativeVolume: 2 });
        if (signal) active = { ...signal, entryAt: bar.timestamp };
      } else if ((active.side === 'buy' && bar.low <= active.stopPrice) || (active.side === 'sell' && bar.high >= active.stopPrice)) {
        const grossPnl = -this.riskPerTrade; const costs = executionCost({ notional: active.price, quantity: 1, ...this.costs }) * 2;
        trades.push({ ...active, exitPrice: active.stopPrice, exitAt: bar.timestamp, grossPnl, costs, realizedPnl: Number((grossPnl - costs).toFixed(2)) }); active = null;
      }
    }
    if (active) { const exitPrice = bars.at(-1).close; const direction = active.side === 'buy' ? 1 : -1; const grossPnl = (exitPrice - active.price) * direction; const costs = executionCost({ notional: active.price, quantity: 1, ...this.costs }) * 2; trades.push({ ...active, exitPrice, grossPnl: Number(grossPnl.toFixed(2)), costs, realizedPnl: Number((grossPnl - costs).toFixed(2)) }); }
    return this.result(trades);
  }
  result(trades) { const netPnl = trades.reduce((sum, trade) => sum + trade.realizedPnl, 0); return { initialCapital: this.initialCapital, finalCapital: this.initialCapital + netPnl, netPnl, totalTrades: trades.length, trades }; }
}
