import { adminGet, adminPatch, adminPost } from './directusAdmin';
import { displayName } from './platformAuth';

// In-platform notifications: the header bell, the «Նոր» box on the home
// page and /platform/notifications. Created where things happen (a new
// submission, reply, material or meeting invitation); never emailed.

export type NotificationKind =
  | 'submission'
  | 'reply'
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
    review_note: string | null;
    workshop: { name: string } | null;
    cloud: { name: string } | null;
  } | null;
  meeting: { id: number; title: string } | null;
  file: { id: string; filename: string; review_note: string | null } | null;
}

const FIELDS =
  'id,kind,date_created,read_at,actor.full_name,actor.armenian_name,' +
  'submission.id,submission.workshop.name,submission.cloud.name,' +
  'material.id,material.label,material.review_note,material.workshop.name,material.cloud.name,meeting.id,meeting.title,' +
  'file.id,file.filename,file.review_note';

// Never throws: a failed notification must not fail the action behind it.
export async function notify(
  recipients: number[],
  kind: NotificationKind,
  refs: { actor?: number | null; submission?: number; material?: number; meeting?: number; file?: string }
): Promise<void> {
  const ids = [...new Set(recipients)].filter((id) => id && id !== refs.actor);
  if (!ids.length) return;
  try {
    await adminPost(
      '/items/platform_notifications',
      ids.map((recipient) => ({
        recipient,
        kind,
        actor: refs.actor ?? null,
        submission: refs.submission,
        material: refs.material,
        meeting: refs.meeting,
        file: refs.file,
      }))
    );
  } catch (e) {
    console.error('notify failed:', e);
  }
}

// The members facilitating a workshop/cloud.
export async function groupFacilitatorIds(workshop: number | null, cloud: number | null): Promise<number[]> {
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
  if ((n.kind === 'submission' || n.kind === 'reply') && n.submission) return `/platform/submissions/${n.submission.id}`;
  if (n.kind === 'material' && n.material) return `/api/platform/materials/${n.material.id}/open`;
  if (n.kind.startsWith('material_') && n.material) return `/platform/view/${n.material.id}`;
  if (n.kind === 'meeting' && n.meeting) return `/platform/facilitator#zardipum-${n.meeting.id}`;
  if (n.kind.startsWith('file_') && n.file) return `/platform/file/${n.file.id}`;
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
    case 'reply':
      return fill(L('notif_reply', '{name} պատասխանեց՝ {group}'), { name, group: group(n.submission) });
    case 'material':
      return fill(L('notif_material', 'Նոր նիւթ՝ «{label}» · {group}'), { label: n.material?.label ?? '', group: group(n.material) });
    case 'meeting':
      return fill(L('notif_meeting', 'Նոր Զարդիպում՝ {title}'), { title: n.meeting?.title ?? '' });
    case 'file_review':
      return fill(L('notif_file_review', '{name} նոր ծրար մը բեռնեց՝ ստուգելու․ «{file}»'), { name, file: n.file?.filename ?? '' });
    case 'file_approved':
      return fill(L('notif_file_approved', '«{file}» ծրարդ հաստատուեցաւ։'), { file: n.file?.filename ?? '' });
    case 'material_review':
      return fill(L('notif_material_review', '{name} նոր գրութիւն մը աւելցուց՝ ստուգելու․ «{label}»'), { name, label: n.material?.label ?? '' });
    case 'material_approved':
      return fill(L('notif_material_approved', '«{label}» գրութիւնդ հաստատուեցաւ։'), { label: n.material?.label ?? '' });
    case 'material_rejected': {
      const text = fill(L('notif_material_rejected', '«{label}» գրութիւնդ չհաստատուեցաւ։'), { label: n.material?.label ?? '' });
      return n.material?.review_note ? `${text} ${n.material.review_note}` : text;
    }
    case 'file_rejected': {
      const text = fill(L('notif_file_rejected', '«{file}» ծրարդ չհաստատուեցաւ։'), { file: n.file?.filename ?? '' });
      return n.file?.review_note ? `${text} ${n.file.review_note}` : text;
    }
  }
}
