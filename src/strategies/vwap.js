export function evaluateVwap({ symbol, price, vwap, trend }) {
  if (!vwap || !trend) return null;
  if (trend === 'up' && price > vwap) return { symbol, side: 'buy', price, stopPrice: vwap, strategy: 'VWAP_CONTINUATION', confidence: 0.55 };
  if (trend === 'down' && price < vwap) return { symbol, side: 'sell', price, stopPrice: vwap, strategy: 'VWAP_CONTINUATION', confidence: 0.55 };
  return null;
}
