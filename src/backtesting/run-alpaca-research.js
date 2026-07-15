import { AlpacaDataProvider } from '../data/alpaca-data-provider.js';
import { walkForwardValidate } from './walk-forward.js';
import { evaluatePaperReadiness } from './research-gate.js';
const symbol = process.env.RESEARCH_SYMBOL ?? 'SPY';
const provider = new AlpacaDataProvider({ apiKey: process.env.ALPACA_API_KEY, apiSecret: process.env.ALPACA_API_SECRET, symbols: [symbol], feed: process.env.ALPACA_DATA_FEED ?? 'iex' });
if (!process.env.ALPACA_API_KEY || !process.env.ALPACA_API_SECRET) throw new Error('Set Alpaca paper credentials before running research.');
const bars = await provider.getBars(symbol, 1000);
const result = walkForwardValidate(bars, { trainingDays: 20, testDays: 5, costs: { spreadBps: Number(process.env.ESTIMATED_SPREAD_BPS ?? 2), slippageBps: Number(process.env.ESTIMATED_SLIPPAGE_BPS ?? 3) } });
console.log(JSON.stringify({ symbol, result, gate: evaluatePaperReadiness(result) }, null, 2));
