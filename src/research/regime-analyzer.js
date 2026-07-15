import { atr, realizedVolatility, trend } from './indicators.js';
const groups = { NVDA: 'semiconductors', AMD: 'semiconductors', SMCI: 'semiconductors', MSFT: 'mega-cap-tech', AAPL: 'mega-cap-tech', META: 'mega-cap-tech', AMZN: 'mega-cap-tech', GOOGL: 'mega-cap-tech', NFLX: 'mega-cap-tech', TSLA: 'high-beta', COIN: 'high-beta', PLTR: 'high-beta' };
export function analyzeRegime(market, bars, date = new Date()) {
  const openingMinutes = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).reduce((out, part) => ({ ...out, [part.type]: part.value }), {});
  return { symbol: market.symbol, correlationGroup: groups[market.symbol] ?? 'other', gapPercent: market.premarketGapPercent, relativeVolume: market.relativeVolume, realizedVolatility: Number(realizedVolatility(bars).toFixed(6)), atr: Number(atr(bars).toFixed(4)), trend: trend(bars), minutesAfterOpen: Number(openingMinutes.hour) * 60 + Number(openingMinutes.minute) - 570, newsEarningsStatus: 'unavailable-without-licensed-calendar-provider' };
}
