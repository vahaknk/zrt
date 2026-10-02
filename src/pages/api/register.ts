import type { APIRoute } from 'astro';
import { randomInt } from 'crypto';
import { adminGet, adminPost } from '../../lib/directusAdmin';

// The booking link's token, generated here with a cryptographic RNG. The
// "Send registration email" flow uses the token it finds on the new record and
// only falls back to its own (Math.random-based) one for records created by
// hand in Directus. Same shape and lifetime as that fallback: 32 × [a-z0-9],
// valid for 7 days.
const TOKEN_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
function generateBookingToken(): string {
  let token = '';
  for (let i = 0; i < 32; i++) token += TOKEN_CHARS[randomInt(TOKEN_CHARS.length)];
  return token;
}

// Only the registration form's own fields are accepted — the record is created
// with the server's Directus key, so anything else a visitor sends (status,
// token, slot_chosen, notes…) must never reach Directus.
const FORM_FIELDS = ['full_name', 'email', 'city', 'interview_language', 'mailing_language', 'consent'] as const;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }

  // Strip empty strings and undefined values — Directus prefers omitted fields over empty
  const cleanBody: Record<string, unknown> = Object.fromEntries(
    FORM_FIELDS.map((f) => [f, body[f]]).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
  );
  for (const f of FORM_FIELDS) {
    if (f !== 'consent' && cleanBody[f] !== undefined) cleanBody[f] = String(cleanBody[f]).trim().slice(0, 200);
  }
  if (cleanBody.consent !== undefined) cleanBody.consent = cleanBody.consent === true;

  if (!cleanBody.full_name || !cleanBody.email || cleanBody.consent !== true) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  const email = String(cleanBody.email ?? '').trim();
  if (email) {
    try {
      // Block re-registration if this email already booked a slot, or still holds
      // an unexpired token (i.e. their booking link hasn't lapsed yet).
      const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, '');
      const filter = {
        _and: [
          { email: { _icontains: email } },
          { _or: [{ slot_chosen: { _eq: true } }, { token_expires_at: { _gt: nowIso } }] },
        ],
      };
      const existing = await adminGet(
        `/items/registration_requests?filter=${encodeURIComponent(JSON.stringify(filter))}&fields=id,email,slot_chosen&limit=50`
      );
      const matches = (existing.data ?? []).filter(
        (r: any) => String(r.email).toLowerCase() === email.toLowerCase()
      );
      if (matches.length > 0) {
        const alreadyBooked = matches.some((r: any) => r.slot_chosen);
        return new Response(
          JSON.stringify({ error: alreadyBooked ? 'duplicate_booking' : 'duplicate_pending' }),
          { status: 409 }
        );
      }
    } catch (e) {
      console.log('Duplicate-booking check failed:', (e as Error)?.message);
      return new Response(JSON.stringify({ error: 'Failed to validate registration' }), { status: 500 });
    }
  }

  try {
    await adminPost('/items/registration_requests', {
      ...cleanBody,
      token: generateBookingToken(),
      token_expires_at: new Date(Date.now() + TOKEN_LIFETIME_MS).toISOString(),
    });
  } catch (e) {
    console.log('Registration create failed:', (e as Error)?.message);
    return new Response(JSON.stringify({ error: 'Failed to save registration' }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};