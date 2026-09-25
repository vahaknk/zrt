import type { APIRoute } from 'astro';
import { adminGet, adminPatch } from '../../lib/directusAdmin';
import {
  isSlotBookable,
  isSlotInPast,
  isValidBookingToken,
  isTokenExpired,
  wonSlotClaim,
  CLAIM_WINDOW_MS,
  CLAIM_SETTLE_MS,
  type SlotClaim,
} from '../../lib/booking';
import { syncBookingToNotion } from '../../lib/notion';

const SLOT_TAKEN = 'This slot was just taken. Please choose another.';

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), { status });
}

// Serialises bookings within this server process, so two requests here can't
// interleave at all. It can't see other processes/instances — the claim step
// below is what actually guarantees a slot is never over-booked; this just
// makes contention rarer.
let bookingQueue: Promise<unknown> = Promise.resolve();
function withBookingLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = bookingQueue.then(fn, fn);
  bookingQueue = run.catch(() => {});
  return run;
}

export const POST: APIRoute = async ({ request }) => {
  const { token, slot_id, interview_language } = await request.json();

  if (!isValidBookingToken(token) || !Number.isInteger(Number(slot_id)) || Number(slot_id) <= 0) {
    return json({ error: 'Missing token or slot_id' }, 400);
  }
  const slotId = Number(slot_id);

  return withBookingLock(() => book(token, slotId, interview_language));
};

async function book(token: string, slotId: number, interview_language: unknown): Promise<Response> {
  // Re-validate token server-side — inside the lock, so a double-submit from
  // two tabs sees the first booking's slot_chosen.
  let registration: any = null;
  try {
    const res = await adminGet(
      `/items/registration_requests?filter[token][_eq]=${encodeURIComponent(token)}&fields=id,full_name,city,interview_language,token_expires_at,slot_chosen&limit=1`
    );
    registration = res.data?.[0] ?? null;
  } catch (e) {
    return json({ error: 'Failed to validate token' }, 500);
  }

  if (!registration) {
    return json({ error: 'Invalid token' }, 403);
  }

  if (registration.slot_chosen) {
    return json({ error: 'already_booked' }, 409);
  }

  if (isTokenExpired(registration.token_expires_at)) {
    return json({ error: 'Token expired' }, 403);
  }

  // Re-validate the slot itself server-side — never trust that the frontend's
  // list was still fresh (the lead-time booking window may have closed since
  // the page loaded).
  let slot: any = null;
  try {
    const slotRes = await adminGet(`/items/intervew_slots/${slotId}?fields=start_time,capacity,status`);
    slot = slotRes.data;
  } catch (e) {
    return json({ error: 'Failed to validate slot' }, 500);
  }

  if (!slot) {
    return json({ error: 'Invalid slot' }, 400);
  }

  // Cheap check against the status flag the claim step maintains — catches
  // anyone whose picker page was loaded before this slot filled.
  if (slot.status === 'full') {
    return json({ error: SLOT_TAKEN }, 409);
  }

  // Hard floor, independent of the lead-time rule: a slot that has already
  // started can never be booked, no matter what.
  if (isSlotInPast(slot.start_time)) {
    return json({ error: 'This slot has already passed.' }, 400);
  }

  if (!isSlotBookable(slot.start_time)) {
    return json({ error: 'This slot is too close to book online. Please contact us directly.' }, 400);
  }

  const capacity = slot.capacity === null || slot.capacity === undefined ? null : Number(slot.capacity);

  if (capacity !== null) {
    // Count-then-write let two people onto the same 1-capacity slot when
    // their requests overlapped: both counted 0, both wrote. Instead, claim
    // first (interview_slot without slot_chosen — the confirmation flow's
    // guard ignores this, so no email), then read every claim and let the
    // shared ranking in wonSlotClaim decide. Only the winner goes on to set
    // slot_chosen, which is the write that sends the confirmation email.
    try {
      await adminPatch(`/items/registration_requests/${registration.id}`, { interview_slot: slotId });
    } catch (e: any) {
      console.error('Booking claim error:', e?.message);
      return json({ error: 'Failed to save booking' }, 500);
    }

    // Release our claim. Leaving it would only hold the seat until
    // CLAIM_WINDOW_MS runs out, so a failure here isn't fatal.
    const releaseClaim = () =>
      adminPatch(`/items/registration_requests/${registration.id}`, { interview_slot: null }).catch((e) =>
        console.error('Booking claim release error:', e?.message)
      );

    let won = false;
    let claimCount = 0;
    const checkClaims = async () => {
      const cutoff = new Date(Date.now() - CLAIM_WINDOW_MS).toISOString();
      const filter = {
        _and: [
          { interview_slot: { _eq: slotId } },
          { _or: [{ slot_chosen: { _eq: true } }, { date_updated: { _gte: cutoff } }] },
        ],
      };
      const claimsRes = await adminGet(
        `/items/registration_requests?filter=${encodeURIComponent(JSON.stringify(filter))}&fields=id,slot_chosen,date_updated&limit=-1`
      );
      const claims: SlotClaim[] = claimsRes.data ?? [];
      claimCount = claims.length;
      won = wonSlotClaim(claims, registration.id, capacity);
    };
    try {
      await checkClaims();
      // Directus stamps date_updated a moment before the row is committed, so
      // an earlier-stamped claim can still be invisible to this first read.
      // Winners wait for any such claim to land and must still win on a re-read.
      if (won) {
        await new Promise((r) => setTimeout(r, CLAIM_SETTLE_MS));
        await checkClaims();
      }
    } catch (e: any) {
      console.error('Booking claim check error:', e?.message);
      await releaseClaim();
      return json({ error: 'Failed to validate slot' }, 500);
    }

    if (!won) {
      await releaseClaim();
      if (claimCount >= capacity) {
        adminPatch(`/items/intervew_slots/${slotId}`, { status: 'full' }).catch(() => {});
      }
      return json({ error: SLOT_TAKEN }, 409);
    }
  }

  // Confirm — this is the update the "Send interview details" flow emails on.
  try {
    await adminPatch(`/items/registration_requests/${registration.id}`, {
      interview_slot: slotId,
      email_verified: true,
      slot_chosen: true,
      ...(interview_language ? { interview_language } : {}),
    });
  } catch (e: any) {
    console.error('Booking patch error:', e?.message);
    return json({ error: e?.message ?? 'Failed to save booking' }, 500);
  }

  // Sync to Notion — only reserved slots go there, so this fires on booking,
  // not on initial registration. Best-effort: a Notion outage shouldn't fail
  // a booking that's already saved in Directus.
  try {
    await syncBookingToNotion({
      fullName: registration.full_name,
      city: registration.city ?? null,
      interviewLanguage: (interview_language as string) ?? registration.interview_language ?? null,
      slotStartTime: slot.start_time,
    });
  } catch (e: any) {
    console.error('Notion sync error:', e?.message);
  }

  // Mark the slot full once confirmed bookings reach capacity, so the picker
  // stops offering it.
  try {
    if (capacity !== null) {
      const bookedRes = await adminGet(
        `/items/registration_requests?filter[interview_slot][_eq]=${slotId}&filter[slot_chosen][_eq]=true&aggregate[count]=id`
      );
      const count = bookedRes.data?.[0]?.count?.id ?? 0;
      if (Number(count) >= capacity) {
        await adminPatch(`/items/intervew_slots/${slotId}`, { status: 'full' });
      }
    }
  } catch {
    // Non-critical — don't fail the booking if capacity check errors
  }

  return json({ success: true }, 200);
}
