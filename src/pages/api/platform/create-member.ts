import type { APIRoute } from 'astro';
import { adminGet, adminPost } from '../../../lib/directusAdmin';
import { hashPassword } from '../../../lib/platformAuth';

export const POST: APIRoute = async ({ request }) => {
  const { pw, registration_id, password } = await request.json();

  const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD ?? '';
  if (!ADMIN_PASSWORD || pw !== ADMIN_PASSWORD) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!registration_id || !password) {
    return new Response(JSON.stringify({ error: 'Missing registration_id or password' }), { status: 400 });
  }

  let registration: any = null;
  try {
    const res = await adminGet(`/items/registration_requests/${registration_id}?fields=id,full_name,email`);
    registration = res.data;
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to look up registration' }), { status: 500 });
  }

  if (!registration) {
    return new Response(JSON.stringify({ error: 'Registration not found' }), { status: 404 });
  }

  const email = String(registration.email ?? '').trim();
  if (!email) {
    return new Response(JSON.stringify({ error: 'Registration has no email' }), { status: 400 });
  }

  // Enforce email uniqueness at the app level (the Directus field's DB-level
  // unique constraint could not be set up).
  try {
    const existing = await adminGet(
      `/items/platform_members?filter[email][_icontains]=${encodeURIComponent(email)}&fields=id,email&limit=50`
    );
    const dup = (existing.data ?? []).some((r: any) => String(r.email).toLowerCase() === email.toLowerCase());
    if (dup) {
      return new Response(JSON.stringify({ error: 'A member with this email already exists' }), { status: 409 });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to validate email uniqueness' }), { status: 500 });
  }

  try {
    const passwordHash = await hashPassword(password);
    const created = await adminPost('/items/platform_members', {
      registration_request: registration.id,
      email,
      full_name: registration.full_name,
      password_hash: passwordHash,
      status: 'active',
    });
    return new Response(JSON.stringify({ success: true, id: created.data.id, email, password }), { status: 200 });
  } catch (e: any) {
    console.error('Create member error:', e?.message);
    return new Response(JSON.stringify({ error: e?.message ?? 'Failed to create member' }), { status: 500 });
  }
};
