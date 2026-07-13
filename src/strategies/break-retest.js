export function evaluateBreakRetest({ symbol, price, level, retested, direction }) {
  if (!retested || !level || !direction) return null;
  const valid = direction === 'up' ? price > level : price < level;
  return valid ? { symbol, side: direction === 'up' ? 'buy' : 'sell', price, stopPrice: level, strategy: 'BREAK_RETEST', confidence: 0.6 } : null;
}
