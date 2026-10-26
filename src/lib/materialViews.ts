import { adminGet, adminPatch, adminPost } from './directusAdmin';
import type { Member } from './platformAuth';
import { enrolledInGroup, facilitatesGroup } from './submissions';
import { isApproved } from './platformFiles';

// How participants use materials: one material_views row per member and
// material, with how often they opened it and — for video/audio — how much
// they actually played and how far they got. Only participants of the
// group are counted (not its facilitators or the team).

export interface ViewMaterial {
  id: number;
  label: string;
  type: 'video' | 'audio' | 'reading' | 'reminder';
  workshop: { id: number; name: string } | null;
  cloud: { id: number; name: string } | null;
  url: string | null;
  text: string | null;
  review_status: string | null;
  review_note: string | null;
  author: number | null;
  file: {
    id: string;
    filename: string;
    kind: string;
    size: number;
    mime: string;
    status: string;
    allow_download: boolean;
    owner: number | null;
    thumb_key: string | null;
    purpose: string;
    review_status: string | null;
  } | null;
}

export interface MaterialView {
  id: number;
  member: number;
  material: number;
  opens: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
  played_seconds: number;
  max_position: number;
  duration: number;
  completed_at: string | null;
}

type Viewer = Pick<Member, 'id' | 'role' | 'workshop' | 'clouds' | 'facilitates_workshops' | 'facilitates_clouds'>;

const MATERIAL_FIELDS =
  'id,label,type,url,text,review_status,review_note,author,workshop.id,workshop.name,cloud.id,cloud.name,' +
  'file.id,file.filename,file.kind,file.size,file.mime,file.status,file.allow_download,file.owner,file.thumb_key,file.purpose,file.review_status';
const VIEW_FIELDS = 'id,member,material,opens,first_opened_at,last_opened_at,played_seconds,max_position,duration,completed_at';

export async function getMaterial(id: number): Promise<ViewMaterial | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  try {
    return (await adminGet(`/items/materials/${id}?fields=${MATERIAL_FIELDS}`)).data ?? null;
  } catch {
    return null;
  }
}

const groupOf = (m: ViewMaterial) => [m.workshop?.id ?? null, m.cloud?.id ?? null] as const;

// Participants see a material once the moderator approved its text or file
// (no status = from before moderation, counts as approved).
export function materialApproved(m: {
  review_status?: string | null;
  file?: { purpose?: string; review_status?: string | null } | null;
}): boolean {
  return (!m.review_status || m.review_status === 'approved') && (!m.file || isApproved(m.file));
}

export function canSeeMaterial(member: Viewer & { moderator?: boolean | null }, m: ViewMaterial): boolean {
  const [w, c] = groupOf(m);
  if (member.role === 'team' || member.moderator || facilitatesGroup(member, w, c)) return true;
  return enrolledInGroup(member, w, c) && materialApproved(m);
}

// Participants are tracked; facilitators/team looking at a material are not.
export function isTracked(member: Viewer, m: ViewMaterial): boolean {
  const [w, c] = groupOf(m);
  return enrolledInGroup(member, w, c) && !facilitatesGroup(member, w, c);
}

async function viewRow(memberId: number, materialId: number): Promise<MaterialView | null> {
  const res = await adminGet(
    `/items/material_views?filter[member][_eq]=${memberId}&filter[material][_eq]=${materialId}&fields=${VIEW_FIELDS}&limit=1`
  );
  return res.data?.[0] ?? null;
}

export async function recordOpen(memberId: number, materialId: number): Promise<void> {
  const now = new Date().toISOString();
  const row = await viewRow(memberId, materialId);
  if (row) await adminPatch(`/items/material_views/${row.id}`, { opens: row.opens + 1, last_opened_at: now });
  else await adminPost('/items/material_views', { member: memberId, material: materialId, opens: 1, first_opened_at: now, last_opened_at: now });
}

// A player heartbeat: `delta` seconds really played since the last one,
// the current position and the media length (all seconds).
export async function recordProgress(
  memberId: number,
  materialId: number,
  delta: number,
  position: number,
  duration: number
): Promise<void> {
  const row = await viewRow(memberId, materialId);
  if (!row) return; // only after an open
  const played = row.played_seconds + Math.max(0, Math.min(delta, 60));
  const len = duration > 0 ? Math.round(duration) : row.duration;
  const furthest = Math.max(row.max_position, Math.min(Math.round(position), len || Math.round(position)));
  const patch: Record<string, unknown> = { played_seconds: Math.round(played), max_position: furthest, duration: len };
  if (!row.completed_at && len > 0 && furthest >= len * 0.9) patch.completed_at = new Date().toISOString();
  await adminPatch(`/items/material_views/${row.id}`, patch);
}

export async function viewsFor(materialIds: number[], memberId?: number): Promise<MaterialView[]> {
  if (!materialIds.length) return [];
  try {
    const res = await adminGet(
      `/items/material_views?filter[material][_in]=${materialIds.join(',')}` +
        (memberId ? `&filter[member][_eq]=${memberId}` : '') +
        `&fields=${VIEW_FIELDS}&limit=-1`
    );
    return res.data ?? [];
  } catch (e) {
    console.error('Failed to load material views:', e);
    return [];
  }
}

// Share of a video/audio reached (0–100), or null when nothing was played.
export function percentReached(v: Pick<MaterialView, 'max_position' | 'duration'>): number | null {
  if (!v.duration) return null;
  return Math.min(100, Math.round((v.max_position / v.duration) * 100));
}

// The participants of a group (who the facilitator's numbers are about).
export async function groupParticipants(
  kind: 'workshop' | 'cloud',
  groupId: number
): Promise<Array<{ id: number; full_name: string; armenian_name: string | null }>> {
  const filter = kind === 'workshop' ? `filter[workshop][_eq]=${groupId}` : `filter[clouds][clouds_id][_eq]=${groupId}`;
  try {
    const res = await adminGet(
      `/items/platform_members?${filter}&filter[role][_eq]=student&sort=full_name&fields=id,full_name,armenian_name&limit=-1`
    );
    return res.data ?? [];
  } catch {
    return [];
  }
}
