# ORB Futures Bot

Railway-ready Node.js futures bot architecture. It is **paper trading only** and starts with a simulated data feed; it does not submit orders to a broker.

## Included

- Opening Range Breakout, VWAP continuation, and Break & Retest strategy modules
- Market scanner with relative-volume ranking
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

## Deployment

Connect this repository to the supplied Railway project. Railway detects `railway.json` and runs `npm start`. Set environment variables from `.env.example` in Railway; keep `PAPER_TRADING=true`.

## Before live trading

Add approved broker/data clients, persistent storage, authentication/secret management, contract tick and multiplier rules, comprehensive historical data, and operational monitoring. Independently validate all risk controls before enabling any live route.
