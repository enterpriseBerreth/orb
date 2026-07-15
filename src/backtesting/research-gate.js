export function evaluatePaperReadiness({ totalTrades, netPnl, profitableFolds, folds, maxDrawdown = 0 }, { minimumTrades = 100, minimumProfitableFoldRate = 0.6, maximumDrawdownPercent = 10, initialCapital = 1_000 } = {}) {
  const foldRate = folds ? profitableFolds / folds : 0;
  const checks = { sufficientTrades: totalTrades >= minimumTrades, positiveNetPnl: netPnl > 0, stableAcrossFolds: foldRate >= minimumProfitableFoldRate, drawdownContained: Math.abs(maxDrawdown) <= initialCapital * (maximumDrawdownPercent / 100) };
  return { eligibleForLiveTrading: Object.values(checks).every(Boolean), checks };
}
