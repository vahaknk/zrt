import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { adminGet } from './directusAdmin';

const scryptAsync = promisify(scrypt);
const SESSION_COOKIE = 'zrt_platform_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(plain, salt, 64)) as Buffer;
  return `scrypt:${salt.toString('hex')}:${derived.toString('hex')}`;
}

export async function verifyPassword(plain: string, encoded: string): Promise<boolean> {
  const parts = encoded.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, saltHex, hashHex] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = (await scryptAsync(plain, salt, 64)) as Buffer;
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function sessionCookieOptions() {
  return {
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: 'lax' as const,
  };
}

export { SESSION_COOKIE };

interface Member {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
  workshop: {
    id: number;
    name: string;
    age_group: string;
    schedule_note: string | null;
    zoom_link: string;
    days_of_week: string | null;
    start_time: string | null;
    end_time: string | null;
  } | null;
  clouds: Array<{
    clouds_id: {
      id: number;
      name: string;
      age_groups: string;
      schedule_note: string | null;
      bundle: { id: number; name: string; zoom_link: string };
      day_of_week: string | null;
      start_time: string | null;
      end_time: string | null;
    };
  }>;
}

function getCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

export async function requireMember(request: Request): Promise<Member | null> {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;

  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  const filter = {
    _and: [
      { session_token: { _eq: token } },
      { status: { _eq: 'active' } },
      { session_expires_at: { _gt: nowIso } },
    ],
  };

  try {
    const res = await adminGet(
      `/items/platform_members?filter=${encodeURIComponent(JSON.stringify(filter))}` +
        `&fields=id,email,full_name,is_admin,workshop.id,workshop.name,workshop.age_group,workshop.schedule_note,workshop.zoom_link,` +
        `workshop.days_of_week,workshop.start_time,workshop.end_time,` +
        `clouds.clouds_id.id,clouds.clouds_id.name,clouds.clouds_id.age_groups,clouds.clouds_id.schedule_note,` +
        `clouds.clouds_id.bundle.id,clouds.clouds_id.bundle.name,clouds.clouds_id.bundle.zoom_link,` +
        `clouds.clouds_id.day_of_week,clouds.clouds_id.start_time,clouds.clouds_id.end_time&limit=1`
    );
    return res.data?.[0] ?? null;
  } catch {
    return null;
  }
}

// Same session check as requireMember(), plus an is_admin gate — used by
// /platform/admin/* pages. Returns null for both "not logged in" and
// "logged in but not admin", so callers can redirect to /platform either
// way (it will itself bounce to /platform/login if there's no session).
export async function requireAdmin(request: Request): Promise<Member | null> {
  const member = await requireMember(request);
  return member?.is_admin ? member : null;
}
