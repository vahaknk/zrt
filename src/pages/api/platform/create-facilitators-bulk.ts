import type { APIRoute } from 'astro';
import { requireAdmin, hashPassword, generateUniqueUsername, generateRandomPassword } from '../../../lib/platformAuth';
import { adminGet, adminPost } from '../../../lib/directusAdmin';

interface Entry {
  full_name: string;
  email: string;
}

interface Result {
  full_name: string;
  email: string;
  username?: string;
  password?: string;
  error?: string;
}

export const POST: APIRoute = async ({ request }) => {
  const admin = await requireAdmin(request);
  if (!admin) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { entries, workshop_ids, cloud_ids } = await request.json();
  const workshopIds = Array.isArray(workshop_ids) ? workshop_ids.map(Number) : [];
  const cloudIds = Array.isArray(cloud_ids) ? cloud_ids.map(Number) : [];

  if (!Array.isArray(entries) || entries.length === 0) {
    return new Response(JSON.stringify({ error: 'No entries provided' }), { status: 400 });
  }
  if (workshopIds.length === 0 && cloudIds.length === 0) {
    return new Response(JSON.stringify({ error: 'Assign at least one workshop or cloud to facilitate' }), { status: 400 });
  }

  let existingEmails = new Set<string>();
  try {
    const existing = await adminGet(`/items/platform_members?fields=email&limit=-1`);
    existingEmails = new Set(
      ((existing.data ?? []) as Array<{ email: string }>).map((m) => m.email.toLowerCase())
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to validate email uniqueness' }), { status: 500 });
  }

  const results: Result[] = [];

  for (const raw of entries as Entry[]) {
    const fullName = String(raw.full_name ?? '').trim();
    const email = String(raw.email ?? '').trim();

    if (!fullName || !email) {
      results.push({ full_name: fullName, email, error: 'Missing name or email' });
      continue;
    }
    if (existingEmails.has(email.toLowerCase())) {
      results.push({ full_name: fullName, email, error: 'A member with this email already exists' });
      continue;
    }

    try {
      const password = generateRandomPassword();
      const passwordHash = await hashPassword(password);
      const username = await generateUniqueUsername(fullName);
      await adminPost('/items/platform_members', {
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
      existingEmails.add(email.toLowerCase());
      results.push({ full_name: fullName, email, username, password });
    } catch (e: any) {
      results.push({ full_name: fullName, email, error: e?.message ?? 'Failed to create' });
    }
  }

  return new Response(JSON.stringify({ results }), { status: 200 });
};
