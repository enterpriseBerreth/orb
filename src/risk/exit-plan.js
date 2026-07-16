export function buildExitPlan(signal, regime, { stopAtrMultiplier = 1, targetRMultiple = 1.5, maxHoldMinutes = 30 } = {}) {
  const direction = signal.side === 'buy' ? 1 : -1;
  const structuralRisk = Math.abs(signal.price - signal.stopPrice);
  const volatilityRisk = Math.max(0, regime.atr * stopAtrMultiplier);
  const riskPerShare = Math.max(structuralRisk, volatilityRisk);
  const stopPrice = Number((signal.price - direction * riskPerShare).toFixed(2));
  const targetPrice = Number((signal.price + direction * riskPerShare * targetRMultiple).toFixed(2));
  return { stopPrice, targetPrice, riskPerShare, maxHoldMinutes, trailingActivationR: 1, partialTakeProfitR: 1, moveStopToBreakevenAtR: 1, adverseMoveMinutes: 5, adverseMoveThresholdR: 0.5 };
}
