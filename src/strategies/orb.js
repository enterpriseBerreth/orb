export function evaluateOrb({ symbol, price, openingRange, relativeVolume, breakoutBufferPercent = 0 }) {
  if (!openingRange || relativeVolume < 1) return null;
  const buffer = breakoutBufferPercent / 100;
  if (price > openingRange.high * (1 + buffer)) return signal(symbol, 'buy', price, openingRange.low, 'ORB_BREAKOUT');
  if (price < openingRange.low * (1 - buffer)) return signal(symbol, 'sell', price, openingRange.high, 'ORB_BREAKDOWN');
  return null;
}
export function hasConfirmedOrbBreak(signal, openingRange, bars = [], breakoutBufferPercent = 0, requiredBars = 2) {
  if (!signal || bars.length < requiredBars) return false;
  const boundary = signal.side === 'buy' ? openingRange.high : openingRange.low;
  const buffer = breakoutBufferPercent / 100;
  return bars.slice(-requiredBars).every((bar) => signal.side === 'buy' ? bar.close > boundary * (1 + buffer) : bar.close < boundary * (1 - buffer));
}
function signal(symbol, side, price, stopPrice, strategy) {
  return { symbol, side, price, stopPrice, strategy, confidence: 0.65, createdAt: new Date().toISOString() };
}
