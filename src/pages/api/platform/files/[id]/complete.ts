import type { APIRoute } from 'astro';
import { requireMember } from '../../../../../lib/platformAuth';
import { adminPatch } from '../../../../../lib/directusAdmin';
import { getFile, completeMultipartUpload, createThumbnail } from '../../../../../lib/platformFiles';
import { needsReview, requestReview } from '../../../../../lib/moderation';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

// Called by the browser after every part is uploaded.
export const POST: APIRoute = async ({ request, params }) => {
  const member = await requireMember(request);
  if (!member) return json({ error: 'Unauthorized' }, 401);
  const file = await getFile(String(params.id));
  if (!file || file.owner !== member.id) return json({ error: 'Not found' }, 404);
  if (file.status !== 'uploading' || !file.upload_id) return json({ id: file.id, status: file.status });
  try {
    const size = await completeMultipartUpload(file.storage_key, file.upload_id);
    // Videos go to the video worker (workers/video), which compresses them
    // and marks them ready; everything else is ready now.
    const status = file.kind === 'video' ? 'processing' : 'ready';
    const thumb_key = file.kind === 'image' ? await createThumbnail({ storage_key: file.storage_key, size }) : null;
    // Library files wait for a moderator before participants see them.
    const review = file.purpose === 'library' && needsReview(member);
    await adminPatch(`/items/platform_files/${file.id}`, {
      status,
      size,
      upload_id: null,
      thumb_key,
      ...(file.purpose === 'library' ? { review_status: review ? 'pending' : 'approved' } : {}),
    });
    if (review) await requestReview({ ...file, size }, member).catch((e) => console.error('requestReview failed:', e));
    return json({ id: file.id, status });
  } catch (e: any) {
    console.error('Upload complete failed:', e);
    return json({ error: 'upload_failed' }, 500);
  }
};
