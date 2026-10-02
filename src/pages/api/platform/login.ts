import type { APIRoute } from 'astro';
import { adminGet, adminPatch } from '../../../lib/directusAdmin';
import { generateSessionToken, sessionCookieOptions, SESSION_COOKIE } from '../../../lib/platformAuth';

// Brute-force guard: too many failed logins from one IP, or against one
// username, within the window locks further attempts out until it passes.
// In-memory, so it resets on restart — enough for a single-process server.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const failures = new Map<string, number[]>();

function recentFailures(key: string, now: number): number[] {
  const recent = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length) failures.set(key, recent);
  else failures.delete(key);
  return recent;
}

function recordFailure(key: string, now: number) {
  failures.set(key, [...recentFailures(key, now), now]);
}

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const { username, password } = await request.json().catch(() => ({}));

  const now = Date.now();
  const ip = request.headers.get('cf-connecting-ip') ?? clientAddress ?? 'unknown';
  const ipKey = `ip:${ip}`;
  const userKey = `user:${String(username ?? '').trim().toLowerCase()}`;
  if (recentFailures(ipKey, now).length >= MAX_FAILURES || recentFailures(userKey, now).length >= MAX_FAILURES) {
    return new Response(JSON.stringify({ error: 'Too many attempts. Please try again later.' }), { status: 429 });
  }

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
    recordFailure(ipKey, now);
    recordFailure(userKey, now);
    return new Response(JSON.stringify({ error: 'Invalid username or password.' }), { status: 401 });
  }

  failures.delete(userKey);
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await adminPatch(`/items/platform_members/${member.id}`, {
    session_token: token,
    session_expires_at: expiresAt,
  });
  cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
