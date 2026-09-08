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

// Resolves a literal wall-clock time in an arbitrary IANA zone to its correct
// absolute UTC instant. Guesses the instant using the numbers verbatim, then
// checks what that guess actually displays as in `timeZone` — the gap is the
// zone's UTC offset for this date (so CET/CEST and similar DST rules resolve
// automatically) — and corrects the guess by that gap.
export function zonedWallTimeToUTC(y: number, m: number, d: number, h: number, mi: number, s: number, timeZone: string): Date {
  const guess = Date.UTC(y, m - 1, d, h, mi, s);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
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
  const shownAsUTC = Date.UTC(get('year'), get('month') - 1, get('day'), shownHour, get('minute'), get('second'));
  const offset = shownAsUTC - guess;
  return new Date(guess - offset);
}

export function parseParisWallTime(naive: string): Date {
  const [datePart, timePart = '00:00:00'] = naive.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm, ss] = timePart.split(':');
  return zonedWallTimeToUTC(y, m, d, Number(hh ?? 0), Number(mm ?? 0), Number(ss ?? 0), PARIS_TZ);
}

const WEEKDAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Any date that falls on the given weekday works for offset purposes — only
// the resulting weekday name and clock time are used, so we just need a
// stable reference within the current week (reflecting today's DST state).
function dateForWeekday(weekday: string): { y: number; m: number; d: number } {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun..6=Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekdayOffset = Math.max(WEEKDAY_ORDER.indexOf(weekday.toLowerCase()), 0);
  const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + mondayOffset + weekdayOffset));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export interface ParisSlotParts {
  weekday: string; // Paris weekday the slot's start falls on, e.g. "Monday"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

// Converts one "HH:MM - HH:MM" availability slot, given on `weekday` in the
// respondent's own `sourceTz`, into its Europe/Paris weekday + clock-time
// equivalent (e.g. "Saturday 22:00 - 23:00" in America/Los_Angeles becomes
// "Sunday 07:00 - 08:00" in Paris). Returns null if slotLabel isn't in the
// expected format.
export function convertLocalSlotToParisParts(weekday: string, slotLabel: string, sourceTz: string): ParisSlotParts | null {
  const match = /^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/.exec(slotLabel.trim());
  if (!match) return null;
  const [, sh, sm, eh, em] = match;
  const { y, m, d } = dateForWeekday(weekday);

  const startUTC = zonedWallTimeToUTC(y, m, d, Number(sh), Number(sm), 0, sourceTz);
  const endUTC = zonedWallTimeToUTC(y, m, d, Number(eh), Number(em), 0, sourceTz);

  const parisParts = (date: Date) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: PARIS_TZ,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const weekdayName = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    return { weekdayName, time: `${String(hour).padStart(2, '0')}:${minute}` };
  };

  const start = parisParts(startUTC);
  const end = parisParts(endUTC);
  return { weekday: start.weekdayName, startTime: start.time, endTime: end.time };
}
