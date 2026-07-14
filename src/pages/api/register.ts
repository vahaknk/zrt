import type { APIRoute } from 'astro';
import { adminGet } from '../../lib/directusAdmin';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  // Strip empty strings and undefined values — Directus prefers omitted fields over empty
  const cleanBody = Object.fromEntries(
    Object.entries(body).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
  );

  // Cast armenian_level to number if present
  if (cleanBody.armenian_level !== undefined) {
    cleanBody.armenian_level = Number(cleanBody.armenian_level);
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

  console.log('=== /api/register called ===');
  console.log('Sending to Directus:', JSON.stringify(cleanBody, null, 2));

  const res = await fetch(`${import.meta.env.DIRECTUS_URL}/items/registration_requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanBody),
  });
  
  console.log('Directus response status:', res.status);
  
  if (!res.ok) {
    const errText = await res.text();
    console.log('Directus error body:', errText);
    return new Response(JSON.stringify({ error: errText }), { status: res.status });
  }
  
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};