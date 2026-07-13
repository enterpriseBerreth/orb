import test from 'node:test';
import assert from 'node:assert/strict';
import { TelegramNotifier } from '../src/notifications/telegram-notifier.js';
test('formats and sends a closed-trade Telegram notification', async () => {
  let request;
  const notifier = new TelegramNotifier({ token: 'token', chatId: 'chat', fetchFn: async (url, options) => { request = { url, options }; return { ok: true, json: async () => ({ ok: true }) }; } });
  await notifier.sendTradeExit({ stockName: 'NVDA', price: 100, exitPrice: 105, realizedPnl: 50, capitalBefore: 10000, capitalAfter: 10050, notes: 'Target reached.' });
  assert.match(request.url, /bottoken/); assert.match(request.options.body, /Capital After Trade: \$10050.00/);
});
