import type { APIRoute } from 'astro';
import { adminGet, adminPatch } from '../../../lib/directusAdmin';
import { generateSessionToken, sessionCookieOptions, SESSION_COOKIE } from '../../../lib/platformAuth';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { username, password } = await request.json();

  let member: any = null;
  try {
    const res = await adminGet(
      `/items/platform_members?filter[username][_eq]=${encodeURIComponent(String(username ?? '').trim().toLowerCase())}&fields=id,username,password,status&limit=1`
    );
    member = res.data?.[0] ?? null;
  } catch {
    member = null;
  }

  // Passwords are kept in plain text in the `password` field so admins can
  // read and change them directly in Directus.
  const validPassword = !!member?.password && String(password ?? '') === member.password;

  if (!member || !validPassword || member.status !== 'active') {
    return new Response(JSON.stringify({ error: 'Invalid username or password.' }), { status: 401 });
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
