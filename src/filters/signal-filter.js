export function passesFilters(signal, market, config = {}) {
  if (!signal || market.liquidity !== 'high') return false;
  if (market.relativeVolume < (config.minRelativeVolume ?? 1.5) || signal.confidence < 0.5) return false;
  if ((market.score ?? 0) < (config.minScannerScore ?? 4)) return false;
  if (config.requireNewsEarningsClearance && signal.newsEarningsStatus !== 'clear') return false;
  if (market.spreadBps != null && market.spreadBps > (config.maxSpreadBps ?? 10)) return false;
  const risk = Math.abs(signal.price - signal.stopPrice); const reward = Math.abs((signal.exitPlan?.targetPrice ?? signal.price) - signal.price);
  const cost = signal.price * (((config.estimatedSpreadBps ?? 2) + (config.estimatedSlippageBps ?? 3) + (config.estimatedFeesBps ?? 1)) / 10_000) * 2;
  return risk > 0 && (reward - cost) / risk >= (config.minRewardRiskAfterCosts ?? 1.2);
}
