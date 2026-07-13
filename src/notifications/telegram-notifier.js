export class TelegramNotifier {
  constructor({ token, chatId, fetchFn = globalThis.fetch }) { this.token = token; this.chatId = chatId; this.fetchFn = fetchFn; }
  get enabled() { return Boolean(this.token && this.chatId); }
  async sendTradeExit(trade) {
    const pnl = trade.realizedPnl ?? 0;
    const base = trade.capitalBefore || 1;
    const pnlPercent = (pnl / base) * 100;
    const success = pnl > 0 ? 'Successful: realized a profit.' : pnl < 0 ? 'Unsuccessful: loss realized; review entry timing, stop placement, and confirmation.' : 'Flat: no gain or loss; review setup quality and execution.';
    return this.send([`Trade exited — ${trade.stockName}`, `Entry Price: $${format(trade.price)}`, `Exit Price: $${format(trade.exitPrice)}`, `PNL ($): $${format(pnl)}`, `PNL (%): ${format(pnlPercent)}%`, `Capital Before Trade: $${format(trade.capitalBefore)}`, `Capital After Trade: $${format(trade.capitalAfter)}`, `Notes: ${trade.notes || success}`].join('\n'));
  }
  async sendNightlyReport(report) {
    const pnlPercent = (report.pnl / (report.capitalStart || 1)) * 100;
    const improvement = report.pnl < 0 ? 'Review losing setups, entry confirmation, and risk allocation before the next session.' : 'Review the strongest setups and confirm the same filters remain robust with more data.';
    return this.send([`Nightly ORB report — ${report.date}`, `# of Trades made: ${report.tradeCount}`, `PNL ($): $${format(report.pnl)}`, `PNL (%): ${format(pnlPercent)}%`, `Capital at start of day: $${format(report.capitalStart)}`, `Capital at end of day: $${format(report.capitalEnd)}`, `What could be improved/optimized: ${improvement}`].join('\n'));
  }
  async send(text) {
    if (!this.enabled) return { skipped: true };
    const response = await this.fetchFn(`https://api.telegram.org/bot${this.token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: this.chatId, text }) });
    if (!response.ok) throw new Error(`Telegram notification failed (${response.status})`);
    return response.json();
  }
}
const format = (value) => Number(value ?? 0).toFixed(2);
