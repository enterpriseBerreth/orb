const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export const config = Object.freeze({
  port: number(process.env.PORT, 3000),
  paperTrading: process.env.PAPER_TRADING !== 'false',
  loopMs: number(process.env.MARKET_LOOP_MS, 5000),
  maxDailyLoss: number(process.env.MAX_DAILY_LOSS, 500),
  maxOpenPositions: number(process.env.MAX_OPEN_POSITIONS, 3),
  riskPerTrade: number(process.env.RISK_PER_TRADE, 100),
  maxPortfolioRisk: number(process.env.MAX_PORTFOLIO_RISK, 300),
  broker: process.env.BROKER ?? 'paper',
  symbols: (process.env.SYMBOLS ?? 'ES,NQ,CL,GC').split(',').map((symbol) => symbol.trim()).filter(Boolean)
});
