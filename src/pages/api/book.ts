import type { APIRoute } from 'astro';
import { adminGet, adminPatch } from '../../lib/directusAdmin';
import { isSlotBookable, isSlotInPast } from '../../lib/booking';
import { syncBookingToNotion } from '../../lib/notion';

export const POST: APIRoute = async ({ request }) => {
  const { token, slot_id, interview_language } = await request.json();

  if (!token || !slot_id) {
    return new Response(JSON.stringify({ error: 'Missing token or slot_id' }), { status: 400 });
  }

  // Re-validate token server-side
  let registration: any = null;
  try {
    const res = await adminGet(
      `/items/registration_requests?filter[token][_eq]=${token}&fields=id,full_name,city,interview_language,token_expires_at,slot_chosen&limit=1`
    );
    registration = res.data?.[0] ?? null;
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to validate token' }), { status: 500 });
  }

  if (!registration) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 403 });
  }

  if (registration.slot_chosen) {
    return new Response(JSON.stringify({ error: 'already_booked' }), { status: 409 });
  }

  const expiresAt = new Date(registration.token_expires_at);
  if (isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
    return new Response(JSON.stringify({ error: 'Token expired' }), { status: 403 });
  }

  // Re-validate the slot itself server-side — never trust that the frontend's
  // list was still fresh (the lead-time booking window may have closed since
  // the page loaded).
  let slot: any = null;
  try {
    const slotRes = await adminGet(`/items/intervew_slots/${slot_id}?fields=start_time,capacity,status`);
    slot = slotRes.data;
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to validate slot' }), { status: 500 });
  }

  if (!slot) {
    return new Response(JSON.stringify({ error: 'Invalid slot' }), { status: 400 });
  }

  // Cheap check against the status flag the capacity check below maintains —
  // catches anyone whose picker page was loaded before this slot filled.
  if (slot.status === 'full') {
    return new Response(JSON.stringify({ error: 'This slot was just taken. Please choose another.' }), { status: 409 });
  }

  // Hard floor, independent of the 3-day rule: a slot that has already
  // started can never be booked, no matter what.
  if (isSlotInPast(slot.start_time)) {
    return new Response(JSON.stringify({ error: 'This slot has already passed.' }), { status: 400 });
  }

  if (!isSlotBookable(slot.start_time)) {
    return new Response(
      JSON.stringify({ error: 'This slot is too close to book online. Please contact us directly.' }),
      { status: 400 }
    );
  }

  // Recount right before writing — the `status` flag above is only updated
  // as a side effect of a previous booking, so it can lag (or, if that PATCH
  // ever silently failed, be wrong indefinitely). This is what actually
  // caught two people getting accepted onto the same 1-capacity slot: the
  // status check alone wasn't in place yet when that happened.
  if (slot.capacity !== null && slot.capacity !== undefined) {
    try {
      const bookedRes = await adminGet(
        `/items/registration_requests?filter[interview_slot][_eq]=${slot_id}&filter[slot_chosen][_eq]=true&aggregate[count]=id`
      );
      const count = Number(bookedRes.data?.[0]?.count?.id ?? 0);
      if (count >= Number(slot.capacity)) {
        // Keep the status flag in sync for anyone else about to load the picker.
        adminPatch(`/items/intervew_slots/${slot_id}`, { status: 'full' }).catch(() => {});
        return new Response(JSON.stringify({ error: 'This slot was just taken. Please choose another.' }), { status: 409 });
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Failed to validate slot' }), { status: 500 });
    }
  }

  // Update registration
  try {
    await adminPatch(`/items/registration_requests/${registration.id}`, {
      interview_slot: slot_id,
      email_verified: true,
      slot_chosen: true,
      ...(interview_language ? { interview_language } : {}),
    });
  } catch (e: any) {
    console.error('Booking patch error:', e?.message);
    return new Response(JSON.stringify({ error: e?.message ?? 'Failed to save booking' }), { status: 500 });
  }

  // Sync to Notion — only reserved slots go there, so this fires on booking,
  // not on initial registration. Best-effort: a Notion outage shouldn't fail
  // a booking that's already saved in Directus.
  try {
    await syncBookingToNotion({
      fullName: registration.full_name,
      city: registration.city ?? null,
      interviewLanguage: interview_language ?? registration.interview_language ?? null,
      slotStartTime: slot.start_time,
    });
  } catch (e: any) {
    console.error('Notion sync error:', e?.message);
  }

  // Check slot capacity — mark full if needed
  try {
    if (slot.capacity !== null && slot.capacity !== undefined) {
      const bookedRes = await adminGet(
        `/items/registration_requests?filter[interview_slot][_eq]=${slot_id}&filter[slot_chosen][_eq]=true&aggregate[count]=id`
      );
      const count = bookedRes.data?.[0]?.count?.id ?? 0;
      if (Number(count) >= Number(slot.capacity)) {
        await adminPatch(`/items/intervew_slots/${slot_id}`, { status: 'full' });
      }
    }
  } catch {
    // Non-critical — don't fail the booking if capacity check errors
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};