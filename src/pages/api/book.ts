import type { APIRoute } from 'astro';
import { adminGet, adminPatch } from '../../lib/directusAdmin';
import { isSlotBookable, isSlotInPast } from '../../lib/booking';

export const POST: APIRoute = async ({ request }) => {
  const { token, slot_id, interview_language } = await request.json();

  if (!token || !slot_id) {
    return new Response(JSON.stringify({ error: 'Missing token or slot_id' }), { status: 400 });
  }

  // Re-validate token server-side
  let registration: any = null;
  try {
    const res = await adminGet(
      `/items/registration_requests?filter[token][_eq]=${token}&fields=id,token_expires_at,slot_chosen&limit=1`
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
  // list was still fresh (the 3-day booking window may have closed since the
  // page loaded).
  let slot: any = null;
  try {
    const slotRes = await adminGet(`/items/intervew_slots/${slot_id}?fields=start_time,capacity`);
    slot = slotRes.data;
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to validate slot' }), { status: 500 });
  }

  if (!slot) {
    return new Response(JSON.stringify({ error: 'Invalid slot' }), { status: 400 });
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

  // Check slot capacity — mark full if needed
  try {
    if (slot.capacity !== null && slot.capacity !== undefined) {
      const bookedRes = await adminGet(
        `/items/registration_requests?filter[interview_slot][_eq]=${slot_id}&aggregate[count]=id`
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