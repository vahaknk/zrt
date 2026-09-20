import type { APIRoute } from 'astro';
import { requireAdmin, hashPassword, generateUniqueUsername } from '../../../lib/platformAuth';
import { adminGet, adminPost } from '../../../lib/directusAdmin';

export const POST: APIRoute = async ({ request }) => {
  const admin = await requireAdmin(request);
  if (!admin) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { full_name, email: emailRaw, password, workshop_ids, cloud_ids } = await request.json();

  const fullName = String(full_name ?? '').trim();
  const email = String(emailRaw ?? '').trim();
  const workshopIds = Array.isArray(workshop_ids) ? workshop_ids.map(Number) : [];
  const cloudIds = Array.isArray(cloud_ids) ? cloud_ids.map(Number) : [];

  if (!fullName || !email || !password) {
    return new Response(JSON.stringify({ error: 'Missing name, email, or password' }), { status: 400 });
  }
  if (workshopIds.length === 0 && cloudIds.length === 0) {
    return new Response(JSON.stringify({ error: 'Assign at least one workshop or cloud to facilitate' }), { status: 400 });
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
    const username = await generateUniqueUsername(fullName);
    const created = await adminPost('/items/platform_members', {
      email,
      full_name: fullName,
      username,
      password_hash: passwordHash,
      status: 'active',
      // Directus M2M fields interpret a bare array of numbers as junction-row
      // primary keys (re-parenting existing links) rather than related-item
      // ids — wrapping each id in an object forces it to create fresh links.
      facilitates_workshops: workshopIds.map((id) => ({ workshops_id: id })),
      facilitates_clouds: cloudIds.map((id) => ({ clouds_id: id })),
    });
    return new Response(JSON.stringify({ success: true, id: created.data.id, username, password }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'Failed to create facilitator' }), { status: 500 });
  }
};
