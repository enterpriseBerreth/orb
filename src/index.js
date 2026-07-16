import { config } from './config.js';
import { TradeJournal } from './analytics/journal.js';
import { createPersistence } from './analytics/persistence.js';
import { SimulatedMarketDataFeed } from './data/simulated-feed.js';
import { AlpacaDataProvider } from './data/alpaca-data-provider.js';
import { MarketScanner } from './scanner/scanner.js';
import { RiskManager } from './risk/risk-manager.js';
import { PaperBroker } from './paper/paper-broker.js';
import { AlpacaPaperBroker } from './execution/alpaca-paper-broker.js';
import { PortfolioManager } from './portfolio/portfolio-manager.js';
import { OrderManager } from './execution/order-manager.js';
import { TradingBot } from './core/bot.js';
import { createServer } from './dashboard/server.js';
import { TelegramNotifier } from './notifications/telegram-notifier.js';
import { NightlyReporter } from './notifications/nightly-reporter.js';
if (!config.paperTrading) throw new Error('Live trading is disabled in this starter. Set PAPER_TRADING=true.');
if ((config.marketDataProvider === 'alpaca' || config.broker === 'alpaca-paper') && (!config.alpacaApiKey || !config.alpacaApiSecret)) throw new Error('Alpaca API credentials are required for real market-data paper trading.');
const persistence = createPersistence(config.databaseUrl); await persistence.initialize();
const journal = new TradeJournal({ persistence }); const portfolio = new PortfolioManager({ initialCapital: config.initialCapital });
const broker = config.broker === 'alpaca-paper' ? new AlpacaPaperBroker({ apiKey: config.alpacaApiKey, apiSecret: config.alpacaApiSecret, baseUrl: config.alpacaTradingBaseUrl, portfolio, estimatedFeesBps: config.estimatedFeesBps, maxFailures: config.maxBrokerFailures, retryCooldownMs: config.brokerRetryCooldownMs }) : new PaperBroker({ portfolio });
const feed = config.marketDataProvider === 'alpaca' ? new AlpacaDataProvider({ apiKey: config.alpacaApiKey, apiSecret: config.alpacaApiSecret, symbols: config.symbols, feed: config.alpacaDataFeed }) : new SimulatedMarketDataFeed(config.symbols);
const notifier = new TelegramNotifier({ token: config.telegramBotToken, chatId: config.telegramChatId });
if (broker.discoverBrokerPositions) {
  try { await broker.discoverBrokerPositions(); } catch (error) { journal.record('broker_startup_check_failed', { message: error.message }); await notifier.send(`ORB broker startup alert: ${error.message}. Position safety checks are paused until connectivity recovers.`).catch(() => {}); }
}
const bot = new TradingBot({ feed, scanner: new MarketScanner({ topN: config.scannerTopN }), journal, persistence, notifier, tradeCandidates: config.tradeCandidates, breakoutBufferPercent: config.orbBreakoutBufferPercent, exitConfig: config, orderManager: new OrderManager({ broker, journal, risk: new RiskManager(config) }) });
const nightlyReporter = new NightlyReporter({ broker, portfolio, notifier, journal });
bot.cycle().catch((error) => journal.record('cycle_error', { message: error.message }));
setInterval(() => bot.cycle().catch((error) => journal.record('cycle_error', { message: error.message })), config.loopMs);
setInterval(() => nightlyReporter.check().catch((error) => journal.record('nightly_report_error', { message: error.message })), 60_000);
createServer({ bot, broker, journal, persistence }).listen(config.port, () => console.log(`ORB paper bot listening on :${config.port}`));
