export function evaluateOrb({ symbol, price, openingRange, relativeVolume }) {
  if (!openingRange || relativeVolume < 1) return null;
  if (price > openingRange.high) return signal(symbol, 'buy', price, openingRange.low, 'ORB_BREAKOUT');
  if (price < openingRange.low) return signal(symbol, 'sell', price, openingRange.high, 'ORB_BREAKDOWN');
  return null;
}
function signal(symbol, side, price, stopPrice, strategy) {
  return { symbol, side, price, stopPrice, strategy, confidence: 0.65, createdAt: new Date().toISOString() };
}
