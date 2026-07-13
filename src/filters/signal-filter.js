export function passesFilters(signal, market) {
  if (!signal || market.liquidity !== 'high') return false;
  if (market.relativeVolume < 1 || signal.confidence < 0.5) return false;
  return Math.abs(signal.price - signal.stopPrice) > 0;
}
