# ORB Futures Bot

Railway-ready Node.js stock ORB bot architecture built to validate a strategy through **paper trading first**. It starts with a simulated data feed and does not submit orders to a broker.

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

### Alpaca real-data paper mode

Set `MARKET_DATA_PROVIDER=alpaca` and `BROKER=alpaca-paper` only with Alpaca **paper** credentials in secret environment variables. The bot then uses Alpaca stock snapshots/minute bars for decisions and sends market orders to `https://paper-api.alpaca.markets`. It polls for actual paper fills before recording entries and exits. It never uses Alpaca's live-money endpoint.

### Durable strategy records

With `DATABASE_URL` set to a PostgreSQL connection, every journal event—including opening-range updates, evaluated signals, skipped signals and their exact reason, submitted orders, fills, and exits—is retained in PostgreSQL. Opening ranges are stored for every configured symbol and can be recovered after a service restart. Read recent records at `/history`.

### Research and live-trading gate

`npm run research` runs a cost-aware walk-forward research report using Alpaca bars. It accounts for configured spread, slippage, and per-share fees; it reports fold stability and evaluates a minimum-trade, positive-P&L, drawdown, and out-of-sample gate. The gate is an evidence requirement, not a promise of profitability. `researchLiquidUniverse` is provided for offline research only; the live paper universe remains deliberately narrow until the filters demonstrate stable results. News and earnings are represented in every regime record but remain marked unavailable until a licensed calendar provider is configured.

Paper execution uses volatility-aware Alpaca bracket orders, captures decision-to-fill slippage, and applies a time stop. A broker-health circuit breaker stops repeated failed calls, startup position discovery prevents a deploy from forgetting broker-held positions, and a watchdog verifies protective brackets then force-closes a stale, unprotected, or after-window position. Trailing, partial-profit, breakeven, and adverse-move exit policies are recorded as research candidates; they remain disabled in execution until supported by out-of-sample results.

### Opening-hour stock rules

The default paper account begins with `$1,000` (`INITIAL_CAPITAL=1000`). In Alpaca mode, the internal $1,000 virtual ledger—not the broker's default paper buying power—is authoritative for sizing, P&L, and reporting. The default universe contains liquid U.S. equities and can be changed with `SYMBOLS`. At every scan, the engine retains the highest-ranked 10 candidates (`SCANNER_TOP_N=10`) and evaluates only the best 3 (`TRADE_CANDIDATES=3`). The risk engine independently enforces `MAX_OPEN_POSITIONS=3`, daily-loss and consecutive-loss circuit breakers, and correlation limits. Entries require relative volume, score, spread, reward/risk-after-costs, and—by default—verified news/earnings clearance. Until a licensed news/earnings provider sets that clearance, the strict default safely rejects those entries.

## Deployment

Connect this repository to the supplied Railway project. Railway detects `railway.json` and runs `npm start`. Set environment variables from `.env.example` in Railway; keep `PAPER_TRADING=true`.

## Before live trading

The objective is to validate a repeatable, risk-controlled strategy in paper trading and then integrate a live broker adapter without changing strategy or risk interfaces. Add approved broker/data clients, persistent storage, authentication/secret management, contract rules, comprehensive historical data, and operational monitoring. Independently validate all risk controls before enabling any live route.
