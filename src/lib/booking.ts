// Minimum lead time before an interview slot can be booked online, so admins
// always have at least this many days' notice of any scheduled appointment.
// Measured in whole calendar days (Europe/Paris), not exact hours — a slot
// becomes bookable as soon as its Paris calendar date is far enough out,
// regardless of what time of day "now" is.
const PARIS_TZ = 'Europe/Paris';
const MIN_LEAD_DAYS = 3;

function parisDateStr(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PARIS_TZ }).format(date);
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function minBookableDateStr(now: Date = new Date()): string {
  return addDaysToDateStr(parisDateStr(now), MIN_LEAD_DAYS);
}

export function isSlotBookable(startTime: string, now: Date = new Date()): boolean {
  return parisDateStr(new Date(startTime)) >= minBookableDateStr(now);
}

// Independent of the lead-time rule above — a slot that has already started
// must never be bookable, even if MIN_LEAD_DAYS is later changed or removed.
export function isSlotInPast(startTime: string, now: Date = new Date()): boolean {
  return new Date(startTime).getTime() < now.getTime();
}
