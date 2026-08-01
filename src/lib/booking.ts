// TODO: the 3-day minimum lead-time rule (isSlotBookable / MIN_LEAD_DAYS) was
// reverted pending team approval — see git history on this file to restore it.

// A slot that has already started must never be bookable.
export function isSlotInPast(startTime: string, now: Date = new Date()): boolean {
  return new Date(startTime).getTime() < now.getTime();
}
