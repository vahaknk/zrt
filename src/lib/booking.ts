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

// Booking tokens are interpolated into Directus filter URLs, so anything
// outside this charset (&, [, ], =, …) could smuggle in extra filter params
// and match someone else's registration. The flow generates [a-z0-9]{32}.
export function isValidBookingToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9]{16,128}$/.test(token);
}

// token_expires_at is a Directus dateTime (no timezone) holding UTC wall time
// — the flow writes toISOString() and Directus drops the Z. Parsing it bare
// would read it as the server's local time and shift the expiry.
export function isTokenExpired(expiresAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!expiresAt) return true;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(expiresAt);
  const t = new Date(hasZone ? expiresAt : `${expiresAt}Z`).getTime();
  return isNaN(t) || t < now.getTime();
}

// How long an unconfirmed claim on a slot (interview_slot set, slot_chosen
// still false) keeps holding a seat. A claim is resolved within a second or
// two; this only bounds how long a request that crashed mid-booking blocks it.
export const CLAIM_WINDOW_MS = 5 * 60 * 1000;

// How long a provisional winner waits before re-checking the claims — far
// longer than the gap between Directus stamping a claim and committing it.
export const CLAIM_SETTLE_MS = 300;

export interface SlotClaim {
  id: number;
  slot_chosen: boolean;
  date_updated: string | null;
}

// Decides who gets a seat when several people go for the same slot at once.
// Every contender writes its claim first and only then reads the claims, so
// each one sees at least everyone who claimed before it — and they all rank
// with the same order (confirmed bookings, then earliest claim, then id).
// That makes exactly `capacity` of them winners, however the requests interleave.
export function wonSlotClaim(claims: SlotClaim[], registrationId: number, capacity: number): boolean {
  const ranked = [...claims].sort(
    (a, b) =>
      Number(b.slot_chosen) - Number(a.slot_chosen) ||
      String(a.date_updated ?? '').localeCompare(String(b.date_updated ?? '')) ||
      a.id - b.id
  );
  const position = ranked.findIndex((c) => c.id === registrationId);
  return position !== -1 && position < capacity;
}
