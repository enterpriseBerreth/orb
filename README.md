# ORB Futures Bot

Railway-ready Node.js futures bot architecture. It is **paper trading only** and starts with a simulated data feed; it does not submit orders to a broker.

## Included

- Opening Range Breakout, VWAP continuation, and Break & Retest strategy modules
- Pre-open volatility scanner ranks the top 10 stocks using provider-supplied expected volatility, relative volume, and premarket gap
- Entry engine focuses only on the top 3 ranked candidates, permits at most 3 concurrent positions, and opens no new trades outside 09:30–10:30 a.m. Eastern on weekdays
- Signal filtering, position sizing, daily-loss and open-position limits
- Paper broker, structured in-memory trade journal, and broker abstraction boundary
- Portfolio manager, backtester, metrics, and structured JSON logging
- Data-provider and broker adapter interfaces for licensed live integrations
- Browser dashboard plus JSON endpoints: `/`, `/health`, and `/status`
- Railway and Docker deployment configuration

## Run locally

```bash
cp .env.example .env
npm test
npm start
```

Then open `http://localhost:3000/status`.

Run the sample ORB backtest with `npm run backtest`.

## Architecture

`data → scanner → strategies → filters → risk → order manager → broker/portfolio → analytics/dashboard`

The implementation uses only Node.js standard libraries, keeping deployment small and deterministic. `PaperBroker` is the only active execution route. `LiveDataAdapter` and `LiveBrokerAdapter` are explicit interfaces that must be connected to an approved vendor before any live capability is considered.

### Opening-hour stock rules

The default universe contains liquid U.S. equities and can be changed with `SYMBOLS`. At every scan, the engine retains the highest-ranked 10 candidates (`SCANNER_TOP_N=10`) and evaluates only the best 3 (`TRADE_CANDIDATES=3`). The risk engine independently enforces `MAX_OPEN_POSITIONS=3`. New entries are blocked outside the first hour of the regular U.S. equity session. The simulated feed supplies simulated volatility fields; connect a real provider with premarket volume, gap, news/catalyst, float, and options-implied-volatility data before relying on these rankings.

## Deployment

Connect this repository to the supplied Railway project. Railway detects `railway.json` and runs `npm start`. Set environment variables from `.env.example` in Railway; keep `PAPER_TRADING=true`.

## Before live trading

Add approved broker/data clients, persistent storage, authentication/secret management, contract tick and multiplier rules, comprehensive historical data, and operational monitoring. Independently validate all risk controls before enabling any live route.
