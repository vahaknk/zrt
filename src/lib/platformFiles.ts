import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  ListPartsCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type Part,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { adminGet } from './directusAdmin';
import type { Member } from './platformAuth';
import { canViewSubmissionFile } from './submissions';

// Files uploaded on the platform live in the same Railway bucket Directus
// uses, under platform/. Browsers upload straight to the bucket (multipart,
// presigned) and download through short-lived presigned links handed out
// after a permission check — bucket traffic is free on Railway, traffic
// through this server is not, and videos can be up to 2 GB.

export const MAX_FILE_BYTES = 2 * 1024 ** 3;
const MIN_PART_BYTES = 10 * 1024 ** 2;
const MAX_PARTS = 1000;
const UPLOAD_URL_TTL = 6 * 3600;
const DOWNLOAD_URL_TTL = 6 * 3600; // long enough to watch a long video with seeking

export type FileKind = 'video' | 'audio' | 'image' | 'document' | 'other';
export type FilePurpose = 'library' | 'submission' | 'reply';

export interface PlatformFile {
  id: string;
  filename: string;
  kind: FileKind;
  size: number;
  mime: string;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  purpose: FilePurpose;
  owner: number | null;
  allow_download: boolean;
  storage_key: string;
  thumb_key: string | null;
  // Library files only: participants see them once a moderator approved.
  review_status: 'pending' | 'approved' | 'rejected' | null;
  review_note: string | null;
  upload_id: string | null;
  date_created: string;
}

let client: S3Client | null = null;
function s3(): S3Client {
  client ??= new S3Client({
    endpoint: import.meta.env.PLATFORM_S3_ENDPOINT,
    region: import.meta.env.PLATFORM_S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: import.meta.env.PLATFORM_S3_KEY,
      secretAccessKey: import.meta.env.PLATFORM_S3_SECRET,
    },
  });
  return client;
}
const Bucket = () => import.meta.env.PLATFORM_S3_BUCKET;

// Documents, images, audio and video; nothing executable.
const ALLOWED_EXTENSIONS: Record<string, FileKind> = {
  mp4: 'video', mov: 'video', m4v: 'video', webm: 'video', avi: 'video', mkv: 'video', '3gp': 'video',
  // .weba / .ogg / .m4a: what the in-browser recorder produces.
  weba: 'audio', mp3: 'audio', m4a: 'audio', wav: 'audio', aac: 'audio', ogg: 'audio', oga: 'audio', flac: 'audio', opus: 'audio',
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', heic: 'image', heif: 'image',
  pdf: 'document', doc: 'document', docx: 'document', odt: 'document', rtf: 'document', txt: 'document',
  ppt: 'document', pptx: 'document', odp: 'document', key: 'document', pages: 'document',
  xls: 'document', xlsx: 'document', ods: 'document', csv: 'document', numbers: 'document',
  zip: 'other',
};

export function fileKind(filename: string): FileKind | null {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  return ALLOWED_EXTENSIONS[ext] ?? null;
}

// Keeps the name readable in the bucket (and in the yearly pCloud backup)
// without letting it shape the key.
function safeName(filename: string): string {
  const cleaned = filename
    .normalize('NFC')
    .replace(/[\/\\?%*:|"<>\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || 'file').slice(-120);
}

export function storageKey(id: string, filename: string): string {
  return `platform/${id}/${safeName(filename)}`;
}

export async function startMultipartUpload(key: string, mime: string, size: number) {
  const { UploadId } = await s3().send(
    new CreateMultipartUploadCommand({ Bucket: Bucket(), Key: key, ContentType: mime || 'application/octet-stream' })
  );
  const partSize = Math.max(MIN_PART_BYTES, Math.ceil(size / MAX_PARTS));
  const partCount = Math.max(1, Math.ceil(size / partSize));
  const urls = await Promise.all(
    Array.from({ length: partCount }, (_, i) =>
      getSignedUrl(s3(), new UploadPartCommand({ Bucket: Bucket(), Key: key, UploadId, PartNumber: i + 1 }), {
        expiresIn: UPLOAD_URL_TTL,
      })
    )
  );
  return { uploadId: UploadId!, partSize, urls };
}

// The browser can't read part ETags (not exposed via CORS), so the parts are
// listed server-side before completing.
export async function completeMultipartUpload(key: string, uploadId: string): Promise<number> {
  const parts: Part[] = [];
  let marker: string | undefined;
  do {
    const res = await s3().send(
      new ListPartsCommand({ Bucket: Bucket(), Key: key, UploadId: uploadId, PartNumberMarker: marker })
    );
    parts.push(...(res.Parts ?? []));
    marker = res.IsTruncated ? res.NextPartNumberMarker : undefined;
  } while (marker);
  await s3().send(
    new CompleteMultipartUploadCommand({
      Bucket: Bucket(),
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts.map((p) => ({ PartNumber: p.PartNumber, ETag: p.ETag })) },
    })
  );
  const head = await s3().send(new HeadObjectCommand({ Bucket: Bucket(), Key: key }));
  return Number(head.ContentLength ?? 0);
}

export async function abortMultipartUpload(key: string, uploadId: string): Promise<void> {
  await s3()
    .send(new AbortMultipartUploadCommand({ Bucket: Bucket(), Key: key, UploadId: uploadId }))
    .catch(() => {});
}

export async function deleteObject(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: Bucket(), Key: key }));
}

const THUMB_MAX_SOURCE_BYTES = 60 * 1024 ** 2;

// A ~480 px WebP preview of an image, stored next to it; returns its key, or
// null when the image can't be read (e.g. HEIC) or is unreasonably large.
export async function createThumbnail(file: Pick<PlatformFile, 'storage_key' | 'size'>): Promise<string | null> {
  if (file.size > THUMB_MAX_SOURCE_BYTES) return null;
  try {
    const obj = await s3().send(new GetObjectCommand({ Bucket: Bucket(), Key: file.storage_key }));
    const input = Buffer.from(await obj.Body!.transformToByteArray());
    const output = await sharp(input, { limitInputPixels: 100_000_000 })
      .rotate() // honour the phone's orientation
      .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();
    const key = `${file.storage_key.slice(0, file.storage_key.lastIndexOf('/'))}/preview.webp`;
    await s3().send(new PutObjectCommand({ Bucket: Bucket(), Key: key, Body: output, ContentType: 'image/webp' }));
    return key;
  } catch (e) {
    console.error('Thumbnail failed:', e);
    return null;
  }
}

export async function thumbnailUrl(file: PlatformFile): Promise<string | null> {
  if (!file.thumb_key) return null;
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: Bucket(), Key: file.thumb_key }), { expiresIn: DOWNLOAD_URL_TTL });
}

export async function downloadUrl(file: PlatformFile, attachment: boolean): Promise<string> {
  const disposition = `${attachment ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(file.filename)}`;
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: Bucket(),
      Key: file.storage_key,
      ResponseContentDisposition: disposition,
      ResponseContentType: file.mime || undefined,
    }),
    { expiresIn: DOWNLOAD_URL_TTL }
  );
}

// ---------------------------------------------------------------- Directus

const FILE_FIELDS =
  'id,filename,kind,size,mime,status,purpose,owner,allow_download,storage_key,thumb_key,review_status,review_note,upload_id,date_created';

// Library files need a moderator's approval before participants see them;
// files from before moderation (no status) count as approved.
export function isApproved(file: { purpose?: string; review_status?: string | null }): boolean {
  return file.purpose !== 'library' || !file.review_status || file.review_status === 'approved';
}

export async function getFile(id: string): Promise<PlatformFile | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    return (await adminGet(`/items/platform_files/${id}?fields=${FILE_FIELDS}`)).data ?? null;
  } catch {
    return null;
  }
}

export async function libraryFiles(ownerId: number): Promise<PlatformFile[]> {
  try {
    const res = await adminGet(
      `/items/platform_files?filter[owner][_eq]=${ownerId}&filter[purpose][_eq]=library&filter[status][_neq]=uploading` +
        `&sort=-date_created&fields=${FILE_FIELDS}&limit=-1`
    );
    return res.data ?? [];
  } catch (e) {
    console.error('Failed to load library files:', e);
    return [];
  }
}

// May this member open the file? Its owner always. A submission/reply file:
// whoever can see that submission. A library file: anyone who can see a
// material it's attached to — enrolled in, or facilitating, that
// workshop/cloud.
export async function canViewFile(
  member: Pick<Member, 'id' | 'role' | 'moderator' | 'workshop' | 'clouds' | 'facilitates_workshops' | 'facilitates_clouds'>,
  file: PlatformFile
): Promise<boolean> {
  if (file.owner === member.id) return true;
  if (file.purpose !== 'library') return canViewSubmissionFile(member, file.id);
  if (member.moderator || member.role === 'team') return true;
  // Until approved, only the people running the group see it, not participants.
  if (!isApproved(file)) {
    const res = await adminGet(`/items/materials?filter[file][_eq]=${file.id}&fields=workshop,cloud&limit=-1`);
    return ((res.data ?? []) as Array<{ workshop: number | null; cloud: number | null }>).some(
      (m) =>
        (m.workshop !== null && member.facilitates_workshops.some((w) => w.workshops_id.id === m.workshop)) ||
        (m.cloud !== null && member.facilitates_clouds.some((c) => c.clouds_id.id === m.cloud))
    );
  }
  const workshops = new Set<number>([
    ...(member.workshop ? [member.workshop.id] : []),
    ...member.facilitates_workshops.map((w) => w.workshops_id.id),
  ]);
  const clouds = new Set<number>([
    ...member.clouds.map((c) => c.clouds_id.id),
    ...member.facilitates_clouds.map((c) => c.clouds_id.id),
  ]);
  if (!workshops.size && !clouds.size) return false;
  const res = await adminGet(`/items/materials?filter[file][_eq]=${file.id}&fields=workshop,cloud&limit=-1`);
  return ((res.data ?? []) as Array<{ workshop: number | null; cloud: number | null }>).some(
    (m) => (m.workshop !== null && workshops.has(m.workshop)) || (m.cloud !== null && clouds.has(m.cloud))
  );
}

export function formatSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
