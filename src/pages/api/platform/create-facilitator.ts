import type { APIRoute } from 'astro';
import { requireAdmin, hashPassword, generateUniqueUsername } from '../../../lib/platformAuth';
import { adminGet, adminPost } from '../../../lib/directusAdmin';

export const POST: APIRoute = async ({ request }) => {
  const admin = await requireAdmin(request);
  if (!admin) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { full_name, email: emailRaw, password, workshop_id, cloud_id } = await request.json();

  const fullName = String(full_name ?? '').trim();
  const email = String(emailRaw ?? '').trim();

  if (!fullName || !email || !password) {
    return new Response(JSON.stringify({ error: 'Missing name, email, or password' }), { status: 400 });
  }
  if (!workshop_id && !cloud_id) {
    return new Response(JSON.stringify({ error: 'Assign a workshop or a cloud to facilitate' }), { status: 400 });
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
      facilitates_workshop: workshop_id ? Number(workshop_id) : null,
      facilitates_cloud: cloud_id ? Number(cloud_id) : null,
    });
    return new Response(JSON.stringify({ success: true, id: created.data.id, username, password }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'Failed to create facilitator' }), { status: 500 });
  }
};
