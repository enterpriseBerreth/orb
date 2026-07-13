export class RiskManager {
  constructor({ maxDailyLoss, maxOpenPositions, riskPerTrade, maxPortfolioRisk = Infinity }) { Object.assign(this, { maxDailyLoss, maxOpenPositions, riskPerTrade, maxPortfolioRisk }); }
  approve(signal, account) {
    if (account.realizedPnl <= -this.maxDailyLoss) return { approved: false, reason: 'daily-loss-limit' };
    if (account.openPositions >= this.maxOpenPositions) return { approved: false, reason: 'position-limit' };
    if ((account.openRisk ?? 0) >= this.maxPortfolioRisk) return { approved: false, reason: 'portfolio-risk-limit' };
    const riskPerUnit = Math.abs(signal.price - signal.stopPrice);
    if (!riskPerUnit) return { approved: false, reason: 'invalid-stop' };
    const quantity = Math.max(1, Math.floor(this.riskPerTrade / riskPerUnit));
    return { approved: true, quantity, estimatedRisk: Number((riskPerUnit * quantity).toFixed(2)) };
  }
}
