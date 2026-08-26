// General timezone conversion for the admin scheduling report — converts a
// "HH:MM" or "HH:MM - HH:MM" slot from one IANA zone to another, for a given
// reference date (only matters for which DST offset applies). Handles
// non-whole-hour offsets (e.g. Asia/Tehran is UTC+3:30).
function offsetMinutes(tz: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(instant);
  const tzName = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+0';
  const match = tzName.match(/GMT([+-]\d+)(?::(\d+))?/);
  if (!match) return 0;
  const hours = parseInt(match[1], 10);
  const mins = match[2] ? parseInt(match[2], 10) : 0;
  return (hours < 0 ? -1 : 1) * (Math.abs(hours) * 60 + mins);
}

export function convertTime(hhmm: string, fromTz: string, toTz: string, referenceDate: Date): string {
  const [h, m] = hhmm.split(':').map(Number);
  const naiveUTC = Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), h, m);
  const offset = offsetMinutes(fromTz, new Date(naiveUTC));
  const actualUTC = new Date(naiveUTC - offset * 60000);
  return actualUTC.toLocaleTimeString('en-GB', { timeZone: toTz, hour: '2-digit', minute: '2-digit', hour12: false });
}

export function convertRange(range: string, fromTz: string, toTz: string, referenceDate: Date): string {
  const [start, end] = range.split(' - ');
  return `${convertTime(start, fromTz, toTz, referenceDate)}–${convertTime(end, fromTz, toTz, referenceDate)}`;
}
