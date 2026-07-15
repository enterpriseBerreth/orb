export function executionCost({ notional, quantity, spreadBps = 2, slippageBps = 3, feePerShare = 0.005 }) {
  return Number(((notional * ((spreadBps + slippageBps) / 10_000)) + (quantity * feePerShare)).toFixed(4));
}
