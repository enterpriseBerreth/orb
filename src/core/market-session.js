const easternParts = (date) => Object.fromEntries(new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
}).formatToParts(date).filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value]));

// Regular US equities session: entries only from 09:30 through 10:29:59 ET on weekdays.
export function isUsOpeningHour(date = new Date()) {
  const parts = easternParts(date);
  if (parts.weekday === 'Sat' || parts.weekday === 'Sun') return false;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return minutes >= 570 && minutes < 630;
}
