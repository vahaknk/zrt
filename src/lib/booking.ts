// Minimum lead time before an interview slot can be booked online, so admins
// always have at least this much notice of any scheduled appointment.
// Measured as an exact rolling window (not whole calendar days) — a slot
// becomes bookable once it's this many hours out from the current instant.
//
// TEMPORARY: dropped from 48 to 12 for a few days at the user's request
// (2026-09-21) — change back to 48 afterwards.
import { parseParisWallTime } from './parisTime';

const MIN_LEAD_HOURS = 12;

export function isSlotBookable(startTime: string, now: Date = new Date()): boolean {
  return parseParisWallTime(startTime).getTime() - now.getTime() >= MIN_LEAD_HOURS * 60 * 60 * 1000;
}

// Independent of the lead-time rule above — a slot that has already started
// must never be bookable, even if MIN_LEAD_DAYS is later changed or removed.
export function isSlotInPast(startTime: string, now: Date = new Date()): boolean {
  return parseParisWallTime(startTime).getTime() < now.getTime();
}
