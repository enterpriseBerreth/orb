const easternParts = (date) => Object.fromEntries(new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
}).formatToParts(date).filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value]));

export function usMarketSessionPhase(date = new Date()) {
  const parts = easternParts(date);
  if (parts.weekday === 'Sat' || parts.weekday === 'Sun') return 'closed';
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  if (minutes >= 570 && minutes < 575) return 'building-opening-range';
  if (minutes >= 575 && minutes < 630) return 'trading-window';
  return 'closed';
}
// Entries only after the five-minute opening range is complete and before 10:30 ET.
export function isUsOpeningHour(date = new Date()) { return usMarketSessionPhase(date) === 'trading-window'; }
export function easternTradingDate(date = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(date); }
