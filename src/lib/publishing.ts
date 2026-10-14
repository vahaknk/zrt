import { randomUUID } from 'crypto';
import { adminGet, adminPatch, adminPost } from './directusAdmin';
import { notify } from './notifications';
import { copyObject, presignObject, storageKey } from './platformFiles';
import type { Member } from './platformAuth';

// «Բարեւ» videos and «Լրատու» news are written in Directus. A Flow calls
// /api/platform/publish-hook on every save; once an item is "published" the
// site notifies its audience (once) and, for a video, copies the uploaded
// file into the platform pipeline so the media worker compresses it.

export interface ParevVideo {
  id: number;
  title: string;
  description: string | null;
  date_created: string;
  platform_file: { id: string; filename: string; kind: string; mime: string; status: string; thumb_key: string | null } | null;
}

export interface NewsPost {
  id: number;
  title: string;
  body: string | null;
  audience: 'all' | 'students' | 'facilitators' | 'group';
  workshop: { id: number; name: string } | null;
  cloud: { id: number; name: string } | null;
  date_created: string;
  image: { id: string; type: string | null } | null;
  attachment: { id: string; filename_download: string; type: string | null; filesize: string | null } | null;
}

const VIDEO_FIELDS =
  'id,title,description,date_created,platform_file.id,platform_file.filename,platform_file.kind,platform_file.mime,platform_file.status,platform_file.thumb_key';
const NEWS_FIELDS =
  'id,title,body,audience,date_created,workshop.id,workshop.name,cloud.id,cloud.name,image.id,image.type,' +
  'attachment.id,attachment.filename_download,attachment.type,attachment.filesize';

async function activeMemberIds(filter = ''): Promise<number[]> {
  const res = await adminGet(`/items/platform_members?filter[status][_eq]=active${filter}&fields=id&limit=-1`);
  return (res.data ?? []).map((m: { id: number }) => m.id);
}

// Who a news post is for (member ids), from its audience setting.
async function newsAudienceIds(post: { audience: string; workshop: number | null; cloud: number | null }): Promise<number[]> {
  if (post.audience === 'students') return activeMemberIds('&filter[role][_eq]=student');
  if (post.audience === 'facilitators') return activeMemberIds('&filter[role][_in]=facilitator,team');
  if (post.audience === 'group') {
    const ids = new Set<number>(await activeMemberIds('&filter[role][_eq]=team'));
    const queries = post.workshop
      ? [`&filter[workshop][_eq]=${post.workshop}`, `&filter[facilitates_workshops][workshops_id][_eq]=${post.workshop}`]
      : post.cloud
        ? [`&filter[clouds][clouds_id][_eq]=${post.cloud}`, `&filter[facilitates_clouds][clouds_id][_eq]=${post.cloud}`]
        : [];
    for (const q of queries) (await activeMemberIds(q)).forEach((id) => ids.add(id));
    return [...ids];
  }
  return activeMemberIds();
}

export function canSeeNews(
  member: Pick<Member, 'role' | 'workshop' | 'clouds' | 'facilitates_workshops' | 'facilitates_clouds'>,
  post: Pick<NewsPost, 'audience' | 'workshop' | 'cloud'>
): boolean {
  if (member.role === 'team' || post.audience === 'all') return true;
  const staff = member.role === 'facilitator';
  if (post.audience === 'students') return !staff;
  if (post.audience === 'facilitators') return staff;
  const w = post.workshop?.id;
  const c = post.cloud?.id;
  return (
    (!!w && (member.workshop?.id === w || member.facilitates_workshops.some((x) => x.workshops_id.id === w))) ||
    (!!c && (member.clouds.some((x) => x.clouds_id.id === c) || member.facilitates_clouds.some((x) => x.clouds_id.id === c)))
  );
}

// Called by the Flow. Idempotent: only does what's still owed.
export async function handlePublish(collection: string, id: number): Promise<string[]> {
  const log: string[] = [];
  if (collection === 'parev_videos') {
    const v = (await adminGet(`/items/parev_videos/${id}?fields=id,title,status,notified_at,platform_file,video.id,video.filename_disk,video.filename_download,video.type,video.filesize`)).data;
    if (!v || v.status !== 'published') return ['not published'];
    if (!v.platform_file && v.video?.filename_disk) {
      // Copy Directus' upload into the platform pipeline (compressed by the media worker).
      const fileId = randomUUID();
      const key = storageKey(fileId, v.video.filename_download || v.video.filename_disk);
      await copyObject(v.video.filename_disk, key);
      await adminPost('/items/platform_files', {
        id: fileId,
        filename: v.video.filename_download || v.video.filename_disk,
        kind: 'video',
        size: Number(v.video.filesize ?? 0),
        mime: v.video.type ?? 'video/mp4',
        status: 'processing',
        purpose: 'parev',
        owner: null,
        allow_download: false,
        storage_key: key,
      });
      await adminPatch(`/items/parev_videos/${id}`, { platform_file: fileId });
      log.push('video queued for compression');
    }
    if (!v.notified_at) {
      await notify(await activeMemberIds(), 'parev', { parev_video: id });
      await adminPatch(`/items/parev_videos/${id}`, { notified_at: new Date().toISOString() });
      log.push('everyone notified');
    }
  } else if (collection === 'news') {
    const n = (await adminGet(`/items/news/${id}?fields=id,status,notified_at,audience,workshop,cloud`)).data;
    if (!n || n.status !== 'published') return ['not published'];
    if (!n.notified_at) {
      await notify(await newsAudienceIds(n), 'news', { news: id });
      await adminPatch(`/items/news/${id}`, { notified_at: new Date().toISOString() });
      log.push('audience notified');
    }
  }
  return log;
}

export async function publishedVideos(): Promise<ParevVideo[]> {
  try {
    return (await adminGet(`/items/parev_videos?filter[status][_eq]=published&sort=-date_created&fields=${VIDEO_FIELDS}&limit=-1`)).data ?? [];
  } catch (e) {
    console.error('Failed to load Բարեւ videos:', e);
    return [];
  }
}

export async function getVideo(id: number): Promise<ParevVideo | null> {
  try {
    const v = (await adminGet(`/items/parev_videos/${id}?fields=${VIDEO_FIELDS},status`)).data;
    return v?.status === 'published' ? v : null;
  } catch {
    return null;
  }
}

export async function newsFor(member: Parameters<typeof canSeeNews>[0]): Promise<NewsPost[]> {
  try {
    const posts: NewsPost[] =
      (await adminGet(`/items/news?filter[status][_eq]=published&sort=-date_created&fields=${NEWS_FIELDS}&limit=200`)).data ?? [];
    return posts.filter((p) => canSeeNews(member, p));
  } catch (e) {
    console.error('Failed to load news:', e);
    return [];
  }
}

export async function getNews(id: number): Promise<NewsPost | null> {
  try {
    const n = (await adminGet(`/items/news/${id}?fields=${NEWS_FIELDS},status`)).data;
    return n?.status === 'published' ? n : null;
  } catch {
    return null;
  }
}

// A short-lived link to a Directus upload (news picture/attachment).
export async function directusFileUrl(fileId: string, attachment: boolean): Promise<string | null> {
  const f = (await adminGet(`/files/${fileId}?fields=filename_disk,filename_download,type`).catch(() => ({ data: null }))).data;
  if (!f?.filename_disk) return null;
  return presignObject(f.filename_disk, f.filename_download ?? f.filename_disk, f.type, attachment);
}
