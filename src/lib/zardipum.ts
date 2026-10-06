import { adminGet, adminPatch } from './directusAdmin';
import { zonedInstant } from './timezone';
import { timingSafeEqual } from 'crypto';
import { memberTimezone, timezoneLabel } from './platformAuth';
import { MONTH_LABELS } from './minorFormContent';

// Զարդիպում — facilitator meetings. Admins create them in Directus; a Flow
// calls /api/zardipum/hook on every save and /api/zardipum/reminders every
// few minutes. Everything here is idempotent: what was last emailed is kept
// on the meeting (notified_*, cancel_notified_at, reminder_sent_at) and on
// each participant row (invited_at), so a repeated call only sends what's
// still owed.

const SITE = 'https://zartsants.com';
const FROM = 'Զարցանց Zartsants <contact@zartsants.com>';
const PARIS = 'Europe/Paris';
const REMINDER_MINUTES = 60;

export interface MeetingParticipant {
  id: number; // junction row
  invited_at: string | null;
  platform_members_id: {
    id: number;
    email: string | null;
    full_name: string;
    armenian_name: string | null;
    timezone: string | null;
    registration_request: { timezone: string | null } | null;
  } | null;
}

export interface Meeting {
  id: number;
  title: string;
  starts_at: string; // Paris wall-clock, "YYYY-MM-DDTHH:mm:ss"
  duration_minutes: number;
  zoom_link: string | null;
  status: 'scheduled' | 'cancelled';
  zoom_meeting_id: string | null;
  notified_title: string | null;
  notified_starts_at: string | null;
  notified_duration: number | null;
  notified_zoom_link: string | null;
  cancel_notified_at: string | null;
  reminder_sent_at: string | null;
  participants: MeetingParticipant[];
}

const MEETING_FIELDS =
  'id,title,starts_at,duration_minutes,zoom_link,status,zoom_meeting_id,notified_title,notified_starts_at,' +
  'notified_duration,notified_zoom_link,cancel_notified_at,reminder_sent_at,participants.id,participants.invited_at,' +
  'participants.platform_members_id.id,participants.platform_members_id.email,participants.platform_members_id.full_name,' +
  'participants.platform_members_id.armenian_name,participants.platform_members_id.timezone,' +
  'participants.platform_members_id.registration_request.timezone';

// Constant-time check of the shared secret the Directus Flows send.
export function hookAuthorized(request: Request): boolean {
  const expected = import.meta.env.ZARDIPUM_HOOK_SECRET;
  const given = request.headers.get('x-zardipum-secret') ?? '';
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

// Fields only this module writes. A save that touches nothing else is our own
// bookkeeping echoing back through the Flow and needs no work.
export const BOOKKEEPING_FIELDS = new Set([
  'zoom_meeting_id',
  'notified_title',
  'notified_starts_at',
  'notified_duration',
  'notified_zoom_link',
  'cancel_notified_at',
  'reminder_sent_at',
]);

// ---------------------------------------------------------------- time

// The real instant a Paris wall-clock "YYYY-MM-DDTHH:mm[:ss]" falls on.
export function parisInstant(wallClock: string): Date {
  const [datePart, timePart = '00:00'] = wallClock.split('T');
  const [y, mo, d] = datePart.split('-').map(Number);
  const [h, mi] = timePart.split(':').map(Number);
  return zonedInstant(PARIS, new Date(y, mo - 1, d), h * 60 + mi);
}

export function meetingInstants(m: Pick<Meeting, 'starts_at' | 'duration_minutes'>): { start: Date; end: Date } {
  const start = parisInstant(m.starts_at);
  return { start, end: new Date(start.getTime() + (m.duration_minutes || 60) * 60000) };
}

const WEEKDAY_FULL_SUN_FIRST = ['Կիրակի', 'Երկուշաբթի', 'Երեքշաբթի', 'Չորեքշաբթի', 'Հինգշաբթի', 'Ուրբաթ', 'Շաբաթ'];

function wallParts(instant: Date, tz: string) {
  const p: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)) {
    p[part.type] = part.value;
  }
  const weekdayIdx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { year: p.year, month: Number(p.month), day: Number(p.day), weekdayIdx, time: `${p.hour}:${p.minute}` };
}

// "Երեքշաբթի, 14 Հոկտեմբեր 2026" and "18:00–19:00" in the given zone.
export function formatMeetingTime(m: Pick<Meeting, 'starts_at' | 'duration_minutes'>, tz: string | null) {
  const zone = tz ?? PARIS;
  const { start, end } = meetingInstants(m);
  const s = wallParts(start, zone);
  const e = wallParts(end, zone);
  const time = `${s.time}–${e.time}`;
  return {
    date: `${WEEKDAY_FULL_SUN_FIRST[s.weekdayIdx]}, ${s.day} ${MONTH_LABELS.hyw[s.month - 1]} ${s.year}`,
    time,
    // "Փարիզի ժամով՝ 18:00–19:00", or "19:00–20:00 (Թուրքիա, …)" elsewhere.
    line: zone === PARIS ? `Փարիզի ժամով՝ ${time}` : `${time} (${timezoneLabel(zone)})`,
  };
}

// ---------------------------------------------------------------- Zoom

function zoomConfigured(): boolean {
  return !!(import.meta.env.ZOOM_ACCOUNT_ID && import.meta.env.ZOOM_CLIENT_ID && import.meta.env.ZOOM_CLIENT_SECRET);
}

async function zoomToken(): Promise<string> {
  const basic = Buffer.from(`${import.meta.env.ZOOM_CLIENT_ID}:${import.meta.env.ZOOM_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(import.meta.env.ZOOM_ACCOUNT_ID)}`,
    { method: 'POST', headers: { Authorization: `Basic ${basic}` } }
  );
  if (!res.ok) throw new Error(`Zoom token → ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

function zoomBody(m: Meeting) {
  return {
    topic: m.title,
    type: 2, // scheduled
    start_time: m.starts_at.slice(0, 19),
    timezone: PARIS,
    duration: m.duration_minutes || 60,
    settings: { join_before_host: true, waiting_room: false },
  };
}

async function createZoomMeeting(m: Meeting): Promise<{ id: string; join_url: string }> {
  const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await zoomToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(zoomBody(m)),
  });
  if (!res.ok) throw new Error(`Zoom create → ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { id: String(data.id), join_url: data.join_url };
}

async function updateZoomMeeting(m: Meeting): Promise<void> {
  const res = await fetch(`https://api.zoom.us/v2/meetings/${m.zoom_meeting_id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${await zoomToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(zoomBody(m)),
  });
  if (!res.ok) throw new Error(`Zoom update → ${res.status}: ${await res.text()}`);
}

async function deleteZoomMeeting(m: Meeting): Promise<void> {
  const res = await fetch(`https://api.zoom.us/v2/meetings/${m.zoom_meeting_id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${await zoomToken()}` },
  });
  if (!res.ok && res.status !== 404) throw new Error(`Zoom delete → ${res.status}: ${await res.text()}`);
}

// ---------------------------------------------------------------- email

type EmailKind = 'invite' | 'update' | 'cancel' | 'reminder';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function buildEmail(kind: EmailKind, m: Meeting, p: NonNullable<MeetingParticipant['platform_members_id']>) {
  const name = p.armenian_name?.trim() || p.full_name;
  const t = formatMeetingTime(m, memberTimezone(p));
  const subject = {
    invite: `Զարդիպում՝ ${m.title}`,
    update: `Փոփոխութիւն՝ ${m.title}`,
    cancel: `Ջնջուած է՝ ${m.title}`,
    reminder: `Յիշեցում՝ ${m.title}`,
  }[kind];
  const intro = {
    invite: 'Քեզի կը հրաւիրենք Զարդիպումի մը։',
    update: 'Զարդիպումին մանրամասնութիւնները փոխուած են։ Ահաւասիկ նորերը՝',
    cancel: 'Հետեւեալ Զարդիպումը ջնջուած է։',
    reminder: 'Կ՚ուզէինք յիշեցնել, որ Զարդիպումը մէկ ժամէն կը սկսի։',
  }[kind];
  // No Zoom link in the email: the button opens the meeting on the Փեթակ
  // page, which always has the current link.
  const box = `<p style="margin: 20px 0; padding: 16px 20px; background: #f6f3ee; border-radius: 8px;${kind === 'cancel' ? ' text-decoration: line-through;' : ''}">
<strong>${esc(m.title)}</strong><br/>
${t.date}<br/>
${esc(t.line)}
</p>`;
  const platform =
    kind === 'cancel'
      ? ''
      : `<p>Զարդիպումը կրնաս գտնել նաեւ հարթակին վրայ՝ Փեթակին եւ օրացոյցին մէջ։</p>
<p style="margin: 24px 0;"><a href="${SITE}/platform/facilitator#zardipum-${m.id}" style="display: inline-block; padding: 12px 24px; background: #1a1a1a; color: #ffffff; border-radius: 999px; font-weight: 700; text-decoration: none;">Փեթակ երթալ</a></p>`;
  const html = `<p>Բարե՛ւ ${esc(name)},</p>
<p>${intro}</p>
${box}
${platform}
<p>Սիրով՝<br/>Զարցանցի յանձնախումբ</p>`;
  return { subject, html };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Resend allows ~2 requests/second per account, shared by every meeting
// being processed at once — so space sends out and retry when refused.
let lastSend = 0;
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    const wait = lastSend + 600 - Date.now();
    lastSend = Math.max(Date.now(), lastSend + 600);
    if (wait > 0) await sleep(wait);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${import.meta.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (res.ok) return;
    if (res.status === 429 && attempt < 4) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    throw new Error(`Resend → ${res.status}: ${await res.text()}`);
  }
}

// Sends `kind` to each participant; returns the junction ids that succeeded.
async function sendToAll(kind: EmailKind, m: Meeting, participants: MeetingParticipant[], log: string[]): Promise<number[]> {
  const ok: number[] = [];
  for (const row of participants) {
    const p = row.platform_members_id;
    if (!p?.email) {
      log.push(`${kind}: participant row ${row.id} has no email`);
      continue;
    }
    const { subject, html } = buildEmail(kind, m, p);
    try {
      await sendEmail(p.email, subject, html);
      ok.push(row.id);
      log.push(`${kind} → ${p.email}`);
    } catch (e: any) {
      log.push(`${kind} FAILED → ${p.email}: ${e?.message}`);
    }
  }
  return ok;
}

// ---------------------------------------------------------------- reconcile

async function loadMeeting(id: number): Promise<Meeting | null> {
  try {
    return (await adminGet(`/items/zardipum/${id}?fields=${MEETING_FIELDS}`)).data ?? null;
  } catch {
    return null;
  }
}

const sameWallClock = (a: string | null, b: string | null) => (a ?? '').slice(0, 16) === (b ?? '').slice(0, 16);

// One reconcile per meeting at a time: our own writes come back through the
// Flow while we're still sending, and must not race the first pass.
const locks = new Map<number, Promise<unknown>>();
export function reconcileMeeting(id: number): Promise<string[]> {
  const prev = locks.get(id) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(() => doReconcile(id));
  locks.set(id, next);
  next.finally(() => {
    if (locks.get(id) === next) locks.delete(id);
  });
  return next;
}

async function doReconcile(id: number): Promise<string[]> {
  const log: string[] = [];
  const m = await loadMeeting(id);
  if (!m) return [`meeting ${id} not found`];
  const patch: Record<string, unknown> = {};
  const invited = m.participants.filter((p) => p.invited_at);
  const pending = m.participants.filter((p) => !p.invited_at);

  // Cancelled: tell everyone who was invited, once, and free the Zoom slot.
  if (m.status === 'cancelled') {
    if (!m.cancel_notified_at) {
      await sendToAll('cancel', m, invited, log);
      if (m.zoom_meeting_id && zoomConfigured()) {
        await deleteZoomMeeting(m).catch((e) => log.push(`zoom delete failed: ${e.message}`));
        patch.zoom_meeting_id = null;
      }
      patch.cancel_notified_at = new Date().toISOString();
      await adminPatch(`/items/zardipum/${id}`, patch);
    }
    return log;
  }

  // Re-scheduled after a cancellation: start over, everyone gets a fresh invite.
  if (m.cancel_notified_at) {
    for (const row of m.participants) {
      if (row.invited_at) await adminPatch(`/items/zardipum_participants/${row.id}`, { invited_at: null });
      row.invited_at = null;
    }
    pending.push(...invited.splice(0));
    Object.assign(patch, { cancel_notified_at: null, notified_starts_at: null, reminder_sent_at: null });
    m.notified_starts_at = null;
  }

  // Nothing to email about a meeting that's already over.
  if (meetingInstants(m).end.getTime() < Date.now()) {
    if (Object.keys(patch).length) await adminPatch(`/items/zardipum/${id}`, patch);
    return ['meeting is in the past'];
  }

  // Zoom: create one when no link was given; keep an auto-created one in step.
  const changedTime =
    !!m.notified_starts_at &&
    (!sameWallClock(m.starts_at, m.notified_starts_at) || m.duration_minutes !== m.notified_duration);
  if (zoomConfigured()) {
    try {
      if (!m.zoom_link && !m.zoom_meeting_id) {
        const z = await createZoomMeeting(m);
        m.zoom_link = z.join_url;
        m.zoom_meeting_id = z.id;
        Object.assign(patch, { zoom_link: z.join_url, zoom_meeting_id: z.id });
        log.push('zoom meeting created');
      } else if (m.zoom_meeting_id && (changedTime || m.title !== m.notified_title)) {
        await updateZoomMeeting(m);
        log.push('zoom meeting updated');
      }
    } catch (e: any) {
      log.push(`zoom failed: ${e?.message}`);
    }
  }

  // Already-invited people get one update when anything the email shows
  // changed (the Zoom link isn't in it — the Փեթակ page always has it).
  const changed = !!m.notified_starts_at && (changedTime || m.title !== m.notified_title);
  if (changed && invited.length) await sendToAll('update', m, invited, log);
  if (changedTime) patch.reminder_sent_at = null;

  // Newly added participants get the invitation.
  for (const rowId of await sendToAll('invite', m, pending, log)) {
    await adminPatch(`/items/zardipum_participants/${rowId}`, { invited_at: new Date().toISOString() });
  }

  if (changed || pending.length || !m.notified_starts_at) {
    Object.assign(patch, {
      notified_title: m.title,
      notified_starts_at: m.starts_at,
      notified_duration: m.duration_minutes,
      notified_zoom_link: m.zoom_link,
    });
  }
  // Written last, after every email, so the Flow echo of this save finds
  // nothing left to do.
  if (Object.keys(patch).length) await adminPatch(`/items/zardipum/${id}`, patch);
  return log;
}

// ---------------------------------------------------------------- reminders

function parisWallClock(instant: Date): string {
  const p = wallParts(instant, PARIS);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}T${p.time}:00`;
}

export async function sendDueReminders(): Promise<string[]> {
  const log: string[] = [];
  const now = Date.now();
  // Generous window on the Paris wall clock; the exact cut is done below.
  const from = parisWallClock(new Date(now - 5 * 60000));
  const to = parisWallClock(new Date(now + (REMINDER_MINUTES + 5) * 60000));
  const res = await adminGet(
    `/items/zardipum?filter[status][_eq]=scheduled&filter[reminder_sent_at][_null]=true&filter[send_reminder][_neq]=false` +
      `&filter[starts_at][_between]=${from},${to}&fields=${MEETING_FIELDS}&limit=-1`
  );
  for (const m of (res.data ?? []) as Meeting[]) {
    const minutesLeft = (meetingInstants(m).start.getTime() - now) / 60000;
    if (minutesLeft > REMINDER_MINUTES || minutesLeft < 0) continue;
    await sendToAll('reminder', m, m.participants.filter((p) => p.invited_at), log);
    await adminPatch(`/items/zardipum/${m.id}`, { reminder_sent_at: new Date().toISOString() });
  }
  return log;
}

// ---------------------------------------------------------------- platform

export interface MemberMeeting {
  id: number;
  title: string;
  starts_at: string;
  duration_minutes: number;
  zoom_link: string | null;
  status: 'scheduled' | 'cancelled';
}

// Meetings a member is invited to, from `sinceDays` ago onwards, soonest first.
export async function memberMeetings(memberId: number, sinceDays = 1): Promise<MemberMeeting[]> {
  const since = parisWallClock(new Date(Date.now() - sinceDays * 86400000));
  try {
    const res = await adminGet(
      `/items/zardipum?filter[participants][platform_members_id][_eq]=${memberId}` +
        `&filter[starts_at][_gte]=${since}&sort=starts_at&fields=id,title,starts_at,duration_minutes,zoom_link,status&limit=-1`
    );
    return res.data ?? [];
  } catch (e) {
    console.error('Failed to load zardipum meetings:', e);
    return [];
  }
}

// Meetings overlapping the given Paris dates (YYYY-MM-DD, inclusive).
export async function memberMeetingsBetween(memberId: number, fromDate: string, toDate: string): Promise<MemberMeeting[]> {
  try {
    const res = await adminGet(
      `/items/zardipum?filter[participants][platform_members_id][_eq]=${memberId}` +
        `&filter[starts_at][_between]=${fromDate}T00:00:00,${toDate}T23:59:59&sort=starts_at` +
        `&fields=id,title,starts_at,duration_minutes,zoom_link,status&limit=-1`
    );
    return res.data ?? [];
  } catch (e) {
    console.error('Failed to load zardipum meetings:', e);
    return [];
  }
}
