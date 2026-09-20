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

export function generateRandomPassword(): string {
  return randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
}

// First name + first letter of last name, e.g. "Ani Petrosyan" -> "anip".
// No transliteration — a non-Latin name just produces a non-Latin username,
// which the member can still type fine on their own keyboard/layout.
export function baseUsername(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'user';
  const first = parts[0];
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0] : '';
  const raw = (first + lastInitial).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  return raw || 'user';
}

// Appends 2, 3, ... to the base until it finds one nobody else has yet.
export async function generateUniqueUsername(fullName: string): Promise<string> {
  const base = baseUsername(fullName);
  const existing = await adminGet(
    `/items/platform_members?filter[username][_starts_with]=${encodeURIComponent(base)}&fields=username&limit=-1`
  );
  const taken = new Set(((existing.data ?? []) as Array<{ username: string | null }>).map((m) => (m.username ?? '').toLowerCase()));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}${i}`)) i++;
  return `${base}${i}`;
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

export interface PlatformWorkshop {
  id: number;
  name: string;
  age_group: string;
  schedule_note: string | null;
  zoom_link: string;
  image: string | null;
  schedule: Array<{ day: string; start_time: string; end_time: string }> | null;
}

export interface PlatformCloud {
  id: number;
  name: string;
  age_groups: string;
  schedule_note: string | null;
  bundle: { id: number; name: string; zoom_link: string };
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
  image: string | null;
}

export interface Member {
  id: number;
  email: string;
  full_name: string;
  armenian_name: string | null;
  is_admin: boolean;
  workshop: PlatformWorkshop | null;
  clouds: Array<{ clouds_id: PlatformCloud }>;
  facilitates_workshops: Array<{ workshops_id: PlatformWorkshop }>;
  facilitates_clouds: Array<{ clouds_id: PlatformCloud }>;
}

// The name to show on the platform — the admin-filled Armenian name when
// there is one, otherwise whatever name the person registered/was created
// with (which is already Armenian script for members who don't have a
// separate Latin registration on file).
export function displayName(person: { full_name: string; armenian_name?: string | null }): string {
  return person.armenian_name?.trim() || person.full_name;
}

// A facilitator is any member assigned to run at least one workshop or
// cloud — derived from the assignment itself rather than a separate flag,
// so the two can never drift out of sync.
export function isFacilitator(member: Pick<Member, 'facilitates_workshops' | 'facilitates_clouds'>): boolean {
  return member.facilitates_workshops.length > 0 || member.facilitates_clouds.length > 0;
}

// Every workshop a member should see on their calendar: the one they're
// enrolled in as a participant (if any) plus any they facilitate —
// deduplicated in case both happen to be the same workshop.
export function calendarWorkshops(member: Pick<Member, 'workshop' | 'facilitates_workshops'>) {
  const all = [member.workshop, ...member.facilitates_workshops.map((w) => w.workshops_id)].filter(
    (w): w is NonNullable<typeof w> => w !== null
  );
  const seen = new Set<number>();
  return all.filter((w) => (seen.has(w.id) ? false : (seen.add(w.id), true)));
}

// Same idea for clouds: enrolled-in plus facilitated, deduplicated.
export function calendarClouds(member: Pick<Member, 'clouds' | 'facilitates_clouds'>) {
  const all = [
    ...member.clouds.map((c) => c.clouds_id),
    ...member.facilitates_clouds.map((c) => c.clouds_id),
  ].filter((c): c is NonNullable<typeof c> => c !== null);
  const seen = new Set<number>();
  return all.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}

// Shared by the materials and schedule-override endpoints: only an admin,
// or a facilitator actually assigned to the workshop/cloud in question,
// may manage it.
export function canManageWorkshopOrCloud(
  member: Pick<Member, 'is_admin' | 'facilitates_workshops' | 'facilitates_clouds'>,
  workshop: number | null,
  cloud: number | null
): boolean {
  if (member.is_admin) return true;
  if (workshop && member.facilitates_workshops.some((w) => w.workshops_id.id === workshop)) return true;
  if (cloud && member.facilitates_clouds.some((c) => c.clouds_id.id === cloud)) return true;
  return false;
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
        `&fields=id,email,full_name,armenian_name,is_admin,workshop.id,workshop.name,workshop.age_group,workshop.schedule_note,workshop.zoom_link,` +
        `workshop.image,workshop.schedule,` +
        `clouds.clouds_id.id,clouds.clouds_id.name,clouds.clouds_id.age_groups,clouds.clouds_id.schedule_note,clouds.clouds_id.image,` +
        `clouds.clouds_id.bundle.id,clouds.clouds_id.bundle.name,clouds.clouds_id.bundle.zoom_link,` +
        `clouds.clouds_id.day_of_week,clouds.clouds_id.start_time,clouds.clouds_id.end_time,` +
        `facilitates_workshops.workshops_id.id,facilitates_workshops.workshops_id.name,facilitates_workshops.workshops_id.age_group,` +
        `facilitates_workshops.workshops_id.schedule_note,facilitates_workshops.workshops_id.zoom_link,` +
        `facilitates_workshops.workshops_id.image,facilitates_workshops.workshops_id.schedule,` +
        `facilitates_clouds.clouds_id.id,facilitates_clouds.clouds_id.name,facilitates_clouds.clouds_id.age_groups,` +
        `facilitates_clouds.clouds_id.schedule_note,facilitates_clouds.clouds_id.image,` +
        `facilitates_clouds.clouds_id.bundle.id,facilitates_clouds.clouds_id.bundle.name,facilitates_clouds.clouds_id.bundle.zoom_link,` +
        `facilitates_clouds.clouds_id.day_of_week,facilitates_clouds.clouds_id.start_time,facilitates_clouds.clouds_id.end_time&limit=1`
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
