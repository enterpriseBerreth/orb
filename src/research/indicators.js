export function atr(bars, period = 14) {
  const sample = bars.slice(-(period + 1)); if (sample.length < 2) return 0;
  const ranges = sample.slice(1).map((bar, index) => Math.max(bar.high - bar.low, Math.abs(bar.high - sample[index].close), Math.abs(bar.low - sample[index].close)));
  return ranges.reduce((sum, value) => sum + value, 0) / ranges.length;
}
export function realizedVolatility(bars) {
  const closes = bars.map((bar) => bar.close); if (closes.length < 3) return 0;
  const returns = closes.slice(1).map((close, index) => Math.log(close / closes[index]));
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  return Math.sqrt(returns.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / returns.length);
}
export function trend(bars) { if (bars.length < 10) return 'unknown'; const recent = bars.slice(-5).reduce((sum, bar) => sum + bar.close, 0) / 5; const prior = bars.slice(-10, -5).reduce((sum, bar) => sum + bar.close, 0) / 5; return recent > prior ? 'up' : recent < prior ? 'down' : 'flat'; }
