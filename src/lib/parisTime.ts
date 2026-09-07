// intervew_slots.start_time/end_time are stored as naive "YYYY-MM-DDTHH:mm:ss"
// values with no timezone — they're literal Europe/Paris wall-clock times (this
// is also the assumption baked into notion.ts's `time_zone: 'Europe/Paris'` sync).
//
// `new Date(naiveString)` is NOT safe for these: per the JS spec, a date-time
// string with no timezone designator is parsed as local time of whatever
// environment runs the code — the visitor's browser on the booking page, or
// the server's own timezone elsewhere. The same slot then resolves to a
// different absolute instant (and, near midnight, a different calendar date)
// depending on where it's parsed. Route every naive start_time/end_time value
// through this instead, so it always means the same instant everywhere.
const PARIS_TZ = 'Europe/Paris';

export function parseParisWallTime(naive: string): Date {
  const [datePart, timePart = '00:00:00'] = naive.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm, ss] = timePart.split(':');
  const h = Number(hh ?? 0);
  const mi = Number(mm ?? 0);
  const s = Number(ss ?? 0);

  // Guess the UTC instant using the wall-clock numbers verbatim, then check
  // what that guess actually displays as in Paris. The gap between the two
  // is the Paris UTC offset for this date (handles CET/CEST automatically),
  // so subtracting it corrects the guess to the true instant.
  const guess = Date.UTC(y, m - 1, d, h, mi, s);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PARIS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(guess));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const shownHour = get('hour') % 24; // Intl can render midnight as "24"
  const shownInParisAsUTC = Date.UTC(get('year'), get('month') - 1, get('day'), shownHour, get('minute'), get('second'));
  const offset = shownInParisAsUTC - guess;
  return new Date(guess - offset);
}
