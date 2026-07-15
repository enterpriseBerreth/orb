import { Backtester } from './backtester.js';
export function walkForwardValidate(bars, { trainingDays = 60, testDays = 20, costs = {} } = {}) {
  const sessions = [...new Map(bars.map((bar) => [bar.timestamp.slice(0, 10), []])).entries()].map(([day]) => ({ day, bars: bars.filter((bar) => bar.timestamp.startsWith(day)) }));
  const folds = [];
  for (let index = trainingDays; index + testDays <= sessions.length; index += testDays) {
    const testBars = sessions.slice(index, index + testDays).flatMap((session) => session.bars);
    const result = new Backtester({ costs }).run(testBars);
    folds.push({ trainStart: sessions[index - trainingDays].day, trainEnd: sessions[index - 1].day, testStart: sessions[index].day, testEnd: sessions[index + testDays - 1].day, ...result });
  }
  const netPnl = folds.reduce((sum, fold) => sum + fold.netPnl, 0); const trades = folds.reduce((sum, fold) => sum + fold.totalTrades, 0);
  return { folds, netPnl: Number(netPnl.toFixed(2)), totalTrades: trades, profitableFolds: folds.filter((fold) => fold.netPnl > 0).length, stable: folds.length > 0 && folds.filter((fold) => fold.netPnl > 0).length / folds.length >= 0.6 };
}
