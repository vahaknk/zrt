import type { APIRoute } from 'astro';
import { adminGet, adminPatch } from '../../../lib/directusAdmin';
import { verifyPassword, generateSessionToken, sessionCookieOptions, SESSION_COOKIE } from '../../../lib/platformAuth';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { email, password } = await request.json();

  let member: any = null;
  try {
    const res = await adminGet(
      `/items/platform_members?filter[email][_eq]=${encodeURIComponent(String(email ?? '').trim())}&fields=id,email,password_hash,status&limit=1`
    );
    member = res.data?.[0] ?? null;
  } catch {
    member = null;
  }

  const validPassword = member ? await verifyPassword(String(password ?? ''), member.password_hash) : false;

  if (!member || !validPassword || member.status !== 'active') {
    return new Response(JSON.stringify({ error: 'Invalid email or password.' }), { status: 401 });
  }

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await adminPatch(`/items/platform_members/${member.id}`, {
    session_token: token,
    session_expires_at: expiresAt,
  });
  cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
