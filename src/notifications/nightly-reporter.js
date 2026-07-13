const localDate = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' }).format(date);
const localHour = (date) => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', hour: '2-digit', hourCycle: 'h23' }).format(date));
export class NightlyReporter {
  constructor({ broker, portfolio, notifier, journal }) { Object.assign(this, { broker, portfolio, notifier, journal }); this.dayStartCapital = portfolio.snapshot().capital; this.lastSentDate = null; }
  async check(date = new Date()) {
    const today = localDate(date);
    if (localHour(date) !== 20 || this.lastSentDate === today) return false;
    const current = this.portfolio.snapshot();
    const closedToday = this.broker.orders.filter((order) => order.status === 'closed' && localDate(new Date(order.closedAt)) === today);
    const pnl = closedToday.reduce((total, trade) => total + (trade.realizedPnl ?? 0), 0);
    await this.notifier.sendNightlyReport({ date: today, tradeCount: closedToday.length, pnl, capitalStart: this.dayStartCapital, capitalEnd: current.capital });
    this.journal.record('nightly_report_sent', { date: today, tradeCount: closedToday.length }); this.lastSentDate = today; this.dayStartCapital = current.capital;
    return true;
  }
}
