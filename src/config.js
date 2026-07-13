const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export const config = Object.freeze({
  port: number(process.env.PORT, 3000),
  paperTrading: process.env.PAPER_TRADING !== 'false',
  loopMs: number(process.env.MARKET_LOOP_MS, 5000),
  maxDailyLoss: number(process.env.MAX_DAILY_LOSS, 500),
  maxOpenPositions: number(process.env.MAX_OPEN_POSITIONS, 3),
  riskPerTrade: number(process.env.RISK_PER_TRADE, 100),
  maxPortfolioRisk: number(process.env.MAX_PORTFOLIO_RISK, 300),
  scannerTopN: number(process.env.SCANNER_TOP_N, 10),
  tradeCandidates: number(process.env.TRADE_CANDIDATES, 3),
  initialCapital: number(process.env.INITIAL_CAPITAL, 1_000),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? '',
  broker: process.env.BROKER ?? 'paper',
  symbols: (process.env.SYMBOLS ?? 'NVDA,TSLA,AMD,MSFT,AAPL,META,AMZN,GOOGL,NFLX,COIN,PLTR,SMCI').split(',').map((symbol) => symbol.trim()).filter(Boolean)
});
