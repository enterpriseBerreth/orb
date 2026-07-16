export class RiskManager {
  constructor({ maxDailyLoss, maxOpenPositions, riskPerTradePercent = 1, initialCapital = 1_000, maxPortfolioRisk = Infinity, maxPerCorrelationGroup = 1, maxConsecutiveLosses = 2 }) { Object.assign(this, { maxDailyLoss, maxOpenPositions, riskPerTradePercent, initialCapital, maxPortfolioRisk, maxPerCorrelationGroup, maxConsecutiveLosses }); }
  approve(signal, account) {
    if (account.realizedPnl <= -this.maxDailyLoss) return { approved: false, reason: 'daily-loss-limit' };
    if ((account.consecutiveLosses ?? 0) >= this.maxConsecutiveLosses) return { approved: false, reason: 'consecutive-loss-circuit-breaker' };
    if (account.openPositions >= this.maxOpenPositions) return { approved: false, reason: 'position-limit' };
    if ((account.openRisk ?? 0) >= this.maxPortfolioRisk) return { approved: false, reason: 'portfolio-risk-limit' };
    if (signal.correlationGroup && (account.openCorrelationGroups ?? []).filter((group) => group === signal.correlationGroup).length >= this.maxPerCorrelationGroup) return { approved: false, reason: 'correlation-group-limit' };
    const riskPerUnit = signal.exitPlan?.riskPerShare ?? Math.abs(signal.price - signal.stopPrice);
    if (!riskPerUnit) return { approved: false, reason: 'invalid-stop' };
    const riskCapital = Math.min(Number(account.capital) || this.initialCapital, this.initialCapital);
    const riskBudget = Number((riskCapital * (this.riskPerTradePercent / 100)).toFixed(2));
    const quantity = Math.max(1, Math.floor(riskBudget / riskPerUnit));
    return { approved: true, quantity, estimatedRisk: Number((riskPerUnit * quantity).toFixed(2)), riskBudget };
  }
}
