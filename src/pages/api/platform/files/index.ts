import type { APIRoute } from 'astro';
import { randomUUID } from 'crypto';
import { requireMember, hasFacilitatorPage } from '../../../../lib/platformAuth';
import { adminPost, adminPatch, adminDelete } from '../../../../lib/directusAdmin';
import { MAX_FILE_BYTES, fileKind, storageKey, startMultipartUpload } from '../../../../lib/platformFiles';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

// Starts an upload: records the file and returns presigned part URLs the
// browser PUTs to directly. POST { filename, size, mime }.
export const POST: APIRoute = async ({ request }) => {
  const member = await requireMember(request);
  if (!member) return json({ error: 'Unauthorized' }, 401);
  // Library uploads are for facilitators/team; participant submissions come later.
  if (!hasFacilitatorPage(member)) return json({ error: 'Forbidden' }, 403);

  const body = await request.json().catch(() => ({}));
  const filename = String(body.filename ?? '').trim();
  const size = Number(body.size);
  const mime = String(body.mime ?? '').slice(0, 120);
  const kind = fileKind(filename);
  if (!filename || !Number.isFinite(size) || size <= 0) return json({ error: 'Missing file' }, 400);
  if (size > MAX_FILE_BYTES) return json({ error: 'too_large' }, 400);
  if (!kind) return json({ error: 'type_not_allowed' }, 400);

  const id = randomUUID();
  const key = storageKey(id, filename);
  await adminPost('/items/platform_files', {
    id,
    filename: filename.slice(0, 200),
    kind,
    size,
    mime,
    status: 'uploading',
    purpose: 'library',
    owner: member.id,
    storage_key: key,
  });
  try {
    const { uploadId, partSize, urls } = await startMultipartUpload(key, mime, size);
    await adminPatch(`/items/platform_files/${id}`, { upload_id: uploadId });
    return json({ id, partSize, urls });
  } catch (e: any) {
    await adminDelete(`/items/platform_files/${id}`).catch(() => {});
    console.error('Upload start failed:', e);
    return json({ error: 'upload_failed' }, 500);
  }
};
