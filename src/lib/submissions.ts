import { adminGet } from './directusAdmin';
import type { Member } from './platformAuth';
import { getFile, type FilePurpose } from './platformFiles';

// Work a participant sends to the facilitators of one of their workshops or
// clouds, and the replies on it. Visible to its author, that group's
// facilitators and the team — nobody else.

export interface SubmissionFile {
  id: string;
  filename: string;
  kind: string;
  size: number;
  status: string;
  thumb_key: string | null;
}

export interface SubmissionReply {
  id: number;
  text: string | null;
  date_created: string;
  author: { id: number; full_name: string; armenian_name: string | null } | null;
  file: SubmissionFile | null;
}

export interface Submission {
  id: number;
  note: string | null;
  date_created: string;
  last_activity: string | null;
  workshop: { id: number; name: string } | null;
  cloud: { id: number; name: string } | null;
  author: { id: number; full_name: string; armenian_name: string | null } | null;
  file: SubmissionFile | null;
  replies: SubmissionReply[];
}

type Viewer = Pick<Member, 'id' | 'role' | 'workshop' | 'clouds' | 'facilitates_workshops' | 'facilitates_clouds'>;

const FILE = 'id,filename,kind,size,status,thumb_key';
const SUBMISSION_FIELDS =
  `id,note,date_created,last_activity,workshop.id,workshop.name,cloud.id,cloud.name,` +
  `author.id,author.full_name,author.armenian_name,file.${FILE.replace(/,/g, ',file.')},` +
  `replies.id,replies.text,replies.date_created,replies.author.id,replies.author.full_name,replies.author.armenian_name,` +
  `replies.file.${FILE.replace(/,/g, ',replies.file.')}`;

export function facilitatesGroup(member: Viewer, workshop: number | null, cloud: number | null): boolean {
  if (workshop && member.facilitates_workshops.some((w) => w.workshops_id.id === workshop)) return true;
  if (cloud && member.facilitates_clouds.some((c) => c.clouds_id.id === cloud)) return true;
  return false;
}

export function enrolledInGroup(member: Viewer, workshop: number | null, cloud: number | null): boolean {
  if (workshop && member.workshop?.id === workshop) return true;
  if (cloud && member.clouds.some((c) => c.clouds_id.id === cloud)) return true;
  return false;
}

export function canSeeSubmission(
  member: Viewer,
  sub: { author: { id: number } | number | null; workshop: { id: number } | number | null; cloud: { id: number } | number | null }
): boolean {
  const id = (v: { id: number } | number | null) => (v && typeof v === 'object' ? v.id : v);
  if (member.role === 'team') return true;
  if (id(sub.author) === member.id) return true;
  return facilitatesGroup(member, id(sub.workshop), id(sub.cloud));
}

export async function getSubmission(id: number): Promise<Submission | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  try {
    const res = await adminGet(`/items/submissions/${id}?fields=${SUBMISSION_FIELDS}&deep[replies][_sort]=date_created`);
    return res.data ?? null;
  } catch {
    return null;
  }
}

// A participant's own submissions for one group, newest first.
export async function ownSubmissions(memberId: number, kind: 'workshop' | 'cloud', groupId: number): Promise<Submission[]> {
  try {
    const res = await adminGet(
      `/items/submissions?filter[author][_eq]=${memberId}&filter[${kind}][_eq]=${groupId}` +
        `&sort=-date_created&fields=${SUBMISSION_FIELDS}&deep[replies][_sort]=date_created&limit=-1`
    );
    return res.data ?? [];
  } catch (e) {
    console.error('Failed to load own submissions:', e);
    return [];
  }
}

// Everything sent to one group, most recently active first (facilitator view).
export async function groupSubmissions(kind: 'workshop' | 'cloud', groupId: number): Promise<Submission[]> {
  try {
    const res = await adminGet(
      `/items/submissions?filter[${kind}][_eq]=${groupId}&sort=-last_activity,-date_created` +
        `&fields=${SUBMISSION_FIELDS}&deep[replies][_sort]=date_created&limit=-1`
    );
    return res.data ?? [];
  } catch (e) {
    console.error('Failed to load group submissions:', e);
    return [];
  }
}

// A just-uploaded file may be attached once, by its uploader, for the purpose
// it was uploaded for.
export async function attachableFile(member: { id: number }, fileId: string, purpose: FilePurpose) {
  const file = await getFile(fileId);
  if (!file || file.owner !== member.id || file.purpose !== purpose || file.status === 'uploading') return null;
  const [subs, replies] = await Promise.all([
    adminGet(`/items/submissions?filter[file][_eq]=${file.id}&fields=id&limit=1`),
    adminGet(`/items/submission_replies?filter[file][_eq]=${file.id}&fields=id&limit=1`),
  ]);
  if ((subs.data ?? []).length || (replies.data ?? []).length) return null;
  return file;
}

// Is this file part of a submission thread the member may see?
export async function canViewSubmissionFile(member: Viewer, fileId: string): Promise<boolean> {
  const [subs, replies] = await Promise.all([
    adminGet(`/items/submissions?filter[file][_eq]=${fileId}&fields=author,workshop,cloud&limit=1`),
    adminGet(`/items/submission_replies?filter[file][_eq]=${fileId}&fields=submission.author,submission.workshop,submission.cloud&limit=1`),
  ]);
  const sub = subs.data?.[0] ?? replies.data?.[0]?.submission ?? null;
  return !!sub && canSeeSubmission(member, sub);
}

// "13 Հոկտեմբեր 2026, 21:30" in the viewer's timezone (Paris when unknown).
export function formatDateTime(iso: string, tz: string | null, months: string[]): string {
  const p: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat('en-US', {
    timeZone: tz ?? 'Europe/Paris',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))) {
    p[part.type] = part.value;
  }
  return `${Number(p.day)} ${months[Number(p.month) - 1]} ${p.year}, ${p.hour}:${p.minute}`;
}
