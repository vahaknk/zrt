import { adminGet, adminPatch, adminPost } from './directusAdmin';
import { displayName } from './platformAuth';
import { sendEmail } from './email';

// In-platform notifications: the header bell, the «Նոր» box on the home
// page and /platform/notifications. Created where things happen (a new
// submission, reply, material or meeting invitation); each recipient also
// gets a short email pointing to it (see emailRecipients).

export type NotificationKind =
  | 'submission'
  | 'reply'
  | 'message'
  | 'parev'
  | 'news'
  | 'material'
  | 'meeting'
  | 'file_review'
  | 'file_approved'
  | 'file_rejected'
  | 'material_review'
  | 'material_approved'
  | 'material_rejected';

export interface PlatformNotification {
  id: number;
  kind: NotificationKind;
  date_created: string;
  read_at: string | null;
  actor: { full_name: string; armenian_name: string | null } | null;
  submission: { id: number; workshop: { name: string } | null; cloud: { name: string } | null } | null;
  material: {
    id: number;
    label: string;
    url: string | null;
    review_note: string | null;
    workshop: { name: string } | null;
    cloud: { name: string } | null;
  } | null;
  meeting: { id: number; title: string } | null;
  file: { id: string; filename: string; review_note: string | null } | null;
  parev_video: { id: number; title: string } | null;
  news: { id: number; title: string } | null;
}

const FIELDS =
  'id,kind,date_created,read_at,actor.full_name,actor.armenian_name,' +
  'submission.id,submission.workshop.name,submission.cloud.name,' +
  'material.id,material.label,material.url,material.review_note,material.workshop.name,material.cloud.name,meeting.id,meeting.title,' +
  'file.id,file.filename,file.review_note,parev_video.id,parev_video.title,news.id,news.title';

// Never throws: a failed notification must not fail the action behind it.
export async function notify(
  recipients: number[],
  kind: NotificationKind,
  refs: {
    actor?: number | null;
    submission?: number;
    material?: number;
    meeting?: number;
    file?: string;
    parev_video?: number;
    news?: number;
  }
): Promise<void> {
  const ids = [...new Set(recipients)].filter((id) => id && id !== refs.actor);
  if (!ids.length) return;
  try {
    const created = await adminPost(
      '/items/platform_notifications',
      ids.map((recipient) => ({
        recipient,
        kind,
        actor: refs.actor ?? null,
        submission: refs.submission,
        material: refs.material,
        meeting: refs.meeting,
        file: refs.file,
        parev_video: refs.parev_video,
        news: refs.news,
      }))
    );
    // Not awaited: a big audience (Բարեւ, Լրատու) takes a while at Resend's pace.
    if (!NOT_EMAILED.has(kind)) {
      emailRecipients((created.data ?? []) as Array<{ id: number; recipient: number }>).catch((e) =>
        console.error('notification emails failed:', e)
      );
    }
  } catch (e) {
    console.error('notify failed:', e);
  }
}

// ---------------------------------------------------------------- email

const SITE = 'https://zartsants.com';

// These already send their own, more detailed email (moderation, Զարդիպում).
const NOT_EMAILED = new Set<NotificationKind>(['file_review', 'material_review', 'meeting']);

// At most one email a day while notifications pile up unread: anyone with
// another unread notification from the last 24 hours isn't emailed again.
const QUIET_HOURS = 24;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const firstName = (s: string | null | undefined) => s?.trim().split(/\s+/)[0] ?? '';

async function emailRecipients(created: Array<{ id: number; recipient: number }>): Promise<void> {
  if (!created.length) return;
  const since = new Date(Date.now() - QUIET_HOURS * 3600_000).toISOString();
  const recent = await adminGet(
    `/items/platform_notifications?filter[recipient][_in]=${created.map((n) => n.recipient).join(',')}` +
      `&filter[id][_nin]=${created.map((n) => n.id).join(',')}&filter[read_at][_null]=true` +
      `&filter[date_created][_gte]=${since}&fields=recipient&limit=-1`
  );
  const skip = new Set(((recent.data ?? []) as Array<{ recipient: number }>).map((n) => n.recipient));
  const todo = created.filter((n) => !skip.has(n.recipient));
  if (!todo.length) return;

  const res = await adminGet(
    `/items/platform_members?filter[id][_in]=${todo.map((n) => n.recipient).join(',')}` +
      `&filter[status][_eq]=active&fields=id,email,full_name,armenian_name,role,registration_request.mailing_language&limit=-1`
  );
  const members = new Map(((res.data ?? []) as EmailMember[]).map((m) => [m.id, m]));
  for (const n of todo) {
    const m = members.get(n.recipient);
    if (!m?.email) continue;
    await sendEmail(m.email, notificationSubject(m), notificationEmail(n.id, m)).catch((e) =>
      console.error(`notification email → ${m.email} failed:`, e)
    );
  }
}

interface EmailMember {
  id: number;
  email: string | null;
  full_name: string;
  armenian_name: string | null;
  role: string;
  registration_request: { mailing_language: string | null } | null;
}

// Facilitators and team read Armenian only; participants get Armenian plus
// the mailing language chosen at registration (fr/en), or all three when
// none is on record yet.
function emailLanguage(m: Pick<EmailMember, 'role' | 'registration_request'>): string | null {
  if (m.role === 'facilitator' || m.role === 'team') return 'hyw';
  return m.registration_request?.mailing_language ?? null;
}

function notificationSubject(m: Pick<EmailMember, 'role' | 'registration_request'>): string {
  const lang = emailLanguage(m);
  if (lang === 'hyw') return 'Նոր ծանուցում';
  if (lang === 'fr') return 'Նոր ծանուցում · Nouvelle notification';
  if (lang === 'en') return 'Նոր ծանուցում · New notification';
  return 'Նոր ծանուցում · Nouvelle notification · New notification';
}

function notificationEmail(id: number, m: Omit<EmailMember, 'id' | 'email'>): string {
  const href = `${SITE}/platform/notifications/${id}`;
  const hy = esc(firstName(m.armenian_name) || firstName(m.full_name));
  const latin = esc(firstName(m.full_name));
  const button = (label: string) =>
    `<p style="margin: 24px 0;"><a href="${href}" style="display: inline-block; padding: 12px 24px; background: #1a1a1a; color: #ffffff; border-radius: 999px; font-weight: 700; text-decoration: none;">${label}</a></p>`;
  const lang = emailLanguage(m);
  const parts = [
    `<p><strong>Զարցանցի հարթակին վրայ նոր ծանուցում մը ունի՜ք։</strong></p>
<p>Բարեւ ${hy},</p>
<p>Նոր ծանուցում մը ձեզի կը սպասէ Զարցանցի հարթակին վրայ։ Մուտք գործեցէք ձեր հաշիւը՝ տեսնելու համար, թէ ի՛նչ նորութիւններ կան։</p>
${button('Տեսնել ծանուցումը')}`,
  ];
  if (lang !== 'hyw' && lang !== 'en') {
    parts.push(`<p><strong>Voici une notification de votre compte Zartsants!</strong></p>
<p>Bonjour ${latin},</p>
<p>Une nouvelle information vous attend sur la plateforme Zartsants. Connectez-vous à votre compte pour la découvrir!</p>
${button('Voir la notification')}`);
  }
  if (lang !== 'hyw' && lang !== 'fr') {
    parts.push(`<p><strong>New notification on your Zartsants account!</strong></p>
<p>Hello ${latin},</p>
<p>You have a new notification waiting for you on the Zartsants Platform. Log in to your account to see what’s new!</p>
${button('View Notification')}`);
  }
  return parts.join('\n<hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e0d8;"/>\n');
}

// The members facilitating a workshop/cloud.
export async function groupFacilitatorIds(workshop: number | null, cloud: number | null): Promise<number[]> {
  // No group (a personal conversation): nobody. Never query with a null id —
  // Directus treats "_eq=null" as "has no such link", which matches almost everyone.
  if (!workshop && !cloud) return [];
  const filter = workshop
    ? `filter[facilitates_workshops][workshops_id][_eq]=${workshop}`
    : `filter[facilitates_clouds][clouds_id][_eq]=${cloud}`;
  try {
    const res = await adminGet(`/items/platform_members?${filter}&fields=id&limit=-1`);
    return (res.data ?? []).map((m: { id: number }) => m.id);
  } catch {
    return [];
  }
}

// The participants enrolled in a workshop/cloud.
export async function groupStudentIds(workshop: number | null, cloud: number | null): Promise<number[]> {
  if (!workshop && !cloud) return [];
  const filter = workshop ? `filter[workshop][_eq]=${workshop}` : `filter[clouds][clouds_id][_eq]=${cloud}`;
  try {
    const res = await adminGet(`/items/platform_members?${filter}&filter[role][_eq]=student&fields=id&limit=-1`);
    return (res.data ?? []).map((m: { id: number }) => m.id);
  } catch {
    return [];
  }
}

export async function unreadCount(memberId: number): Promise<number> {
  try {
    const res = await adminGet(
      `/items/platform_notifications?filter[recipient][_eq]=${memberId}&filter[read_at][_null]=true&aggregate[count]=id`
    );
    return Number(res.data?.[0]?.count?.id ?? 0);
  } catch {
    return 0;
  }
}

export async function listNotifications(memberId: number, opts: { unreadOnly?: boolean; limit?: number } = {}) {
  try {
    const res = await adminGet(
      `/items/platform_notifications?filter[recipient][_eq]=${memberId}` +
        (opts.unreadOnly ? '&filter[read_at][_null]=true' : '') +
        `&sort=-date_created&fields=${FIELDS}&limit=${opts.limit ?? 50}`
    );
    return (res.data ?? []) as PlatformNotification[];
  } catch (e) {
    console.error('Failed to load notifications:', e);
    return [];
  }
}

export async function getOwnNotification(id: number, memberId: number) {
  try {
    const res = await adminGet(`/items/platform_notifications/${id}?fields=${FIELDS},recipient`);
    return res.data && res.data.recipient === memberId ? (res.data as PlatformNotification) : null;
  } catch {
    return null;
  }
}

export async function markRead(ids: number[]): Promise<void> {
  if (!ids.length) return;
  await adminPatch('/items/platform_notifications', { keys: ids, data: { read_at: new Date().toISOString() } }).catch(
    (e) => console.error('markRead failed:', e)
  );
}

export function notificationHref(n: PlatformNotification): string {
  if ((n.kind === 'submission' || n.kind === 'reply' || n.kind === 'message') && n.submission) return `/platform/submissions/${n.submission.id}`;
  if (n.kind === 'material' && n.material) return `/api/platform/materials/${n.material.id}/open`;
  if (n.kind.startsWith('material_') && n.material) return `/platform/view/${n.material.id}`;
  if (n.kind === 'meeting' && n.meeting) return `/platform/facilitator#zardipum-${n.meeting.id}`;
  if (n.kind.startsWith('file_') && n.file) return `/platform/file/${n.file.id}`;
  if (n.kind === 'parev' && n.parev_video) return `/platform/parev/${n.parev_video.id}`;
  if (n.kind === 'news' && n.news) return `/platform/lratu#news-${n.news.id}`;
  return '/platform';
}

// The sentence shown for a notification, from editable label templates.
export function notificationText(n: PlatformNotification, L: (key: string, fallback: string) => string): string {
  const name = n.actor ? displayName(n.actor) : '';
  const group = (g: { workshop: { name: string } | null; cloud: { name: string } | null } | null) =>
    g?.workshop?.name ?? g?.cloud?.name ?? '';
  const fill = (tpl: string, vars: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  switch (n.kind) {
    case 'submission':
      return fill(L('notif_submission', '{name} նոր աշխատանք մը ղրկեց՝ {group}'), { name, group: group(n.submission) });
    case 'message':
      // Personal (staff-to-staff) messages have no group.
      return group(n.submission)
        ? fill(L('notif_message', '{name} քեզի նամակ մը ղրկեց՝ {group}'), { name, group: group(n.submission) })
        : fill(L('notif_message_direct', '{name} քեզի նամակ մը ղրկեց'), { name });
    case 'reply':
      // Personal (staff-to-staff) conversations have no group.
      return group(n.submission)
        ? fill(L('notif_reply', '{name} պատասխանեց՝ {group}'), { name, group: group(n.submission) })
        : fill(L('notif_reply_direct', '{name} պատասխանեց'), { name });
    case 'material':
      return fill(L('notif_material', 'Նոր նիւթ՝ «{label}» · {group}'), { label: n.material?.label ?? '', group: group(n.material) });
    case 'meeting':
      return fill(L('notif_meeting', 'Նոր Զարդիպում՝ {title}'), { title: n.meeting?.title ?? '' });
    case 'parev':
      return fill(L('notif_parev', 'Նոր տեսերիզ «Բարեւ»-ի մէջ՝ «{title}»'), { title: n.parev_video?.title ?? '' });
    case 'news':
      return fill(L('notif_news', 'Լրատու՝ «{title}»'), { title: n.news?.title ?? '' });
    case 'file_review':
      return fill(L('notif_file_review', '{name} նոր ծրար մը բեռնեց՝ ստուգելու․ «{file}»'), { name, file: n.file?.filename ?? '' });
    case 'file_approved':
      return fill(L('notif_file_approved', '«{file}» ծրարդ հաստատուեցաւ։'), { file: n.file?.filename ?? '' });
    case 'material_review':
      return n.material?.url
        ? fill(L('notif_link_review', '{name} նոր յղում մը աւելցուց՝ ստուգելու․ «{label}»'), { name, label: n.material.label })
        : fill(L('notif_material_review', '{name} նոր գրութիւն մը աւելցուց՝ ստուգելու․ «{label}»'), { name, label: n.material?.label ?? '' });
    case 'material_approved':
      return n.material?.url
        ? fill(L('notif_link_approved', '«{label}» յղումդ հաստատուեցաւ։'), { label: n.material.label })
        : fill(L('notif_material_approved', '«{label}» գրութիւնդ հաստատուեցաւ։'), { label: n.material?.label ?? '' });
    case 'material_rejected': {
      const text = n.material?.url
        ? fill(L('notif_link_rejected', '«{label}» յղումդ չհաստատուեցաւ։'), { label: n.material.label })
        : fill(L('notif_material_rejected', '«{label}» գրութիւնդ չհաստատուեցաւ։'), { label: n.material?.label ?? '' });
      return n.material?.review_note ? `${text} ${n.material.review_note}` : text;
    }
    case 'file_rejected': {
      const text = fill(L('notif_file_rejected', '«{file}» ծրարդ չհաստատուեցաւ։'), { file: n.file?.filename ?? '' });
      return n.file?.review_note ? `${text} ${n.file.review_note}` : text;
    }
  }
}

// Conversations (submission ids) with unread submission/reply notifications.
export async function unreadConversationIds(memberId: number): Promise<Set<number>> {
  try {
    const res = await adminGet(
      `/items/platform_notifications?filter[recipient][_eq]=${memberId}&filter[read_at][_null]=true` +
        `&filter[kind][_in]=submission,reply,message&fields=submission&limit=-1`
    );
    return new Set(((res.data ?? []) as Array<{ submission: number | null }>).map((n) => n.submission ?? 0).filter(Boolean));
  } catch {
    return new Set();
  }
}

// Opening a conversation reads its notifications.
export async function markConversationRead(memberId: number, submissionId: number): Promise<void> {
  try {
    const res = await adminGet(
      `/items/platform_notifications?filter[recipient][_eq]=${memberId}&filter[read_at][_null]=true` +
        `&filter[submission][_eq]=${submissionId}&fields=id&limit=-1`
    );
    await markRead(((res.data ?? []) as Array<{ id: number }>).map((n) => n.id));
  } catch (e) {
    console.error('markConversationRead failed:', e);
  }
}
