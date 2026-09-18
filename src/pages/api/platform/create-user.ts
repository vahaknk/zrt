import type { APIRoute } from 'astro';
import { requireAdmin, hashPassword } from '../../../lib/platformAuth';
import { adminGet, adminPost } from '../../../lib/directusAdmin';

export const POST: APIRoute = async ({ request }) => {
  const admin = await requireAdmin(request);
  if (!admin) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { registration_id, password } = await request.json();

  if (!registration_id || !password) {
    return new Response(JSON.stringify({ error: 'Missing registration_id or password' }), { status: 400 });
  }

  let registration: any = null;
  try {
    const res = await adminGet(`/items/registration_requests/${registration_id}?fields=id,full_name,email`);
    registration = res.data;
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to look up registration' }), { status: 500 });
  }
  if (!registration) {
    return new Response(JSON.stringify({ error: 'Registration not found' }), { status: 404 });
  }

  const email = String(registration.email ?? '').trim();
  if (!email) {
    return new Response(JSON.stringify({ error: 'Registration has no email' }), { status: 400 });
  }

  try {
    const existing = await adminGet(
      `/items/platform_members?filter[email][_icontains]=${encodeURIComponent(email)}&fields=id,email&limit=50`
    );
    const dup = (existing.data ?? []).some((r: any) => String(r.email).toLowerCase() === email.toLowerCase());
    if (dup) {
      return new Response(JSON.stringify({ error: 'A member with this email already exists' }), { status: 409 });
    }
  } catch {
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
    return new Response(JSON.stringify({ error: e?.message ?? 'Failed to create member' }), { status: 500 });
  }
};
