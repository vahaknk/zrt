import type { APIRoute } from 'astro';
import { requireMember } from '../../../../../lib/platformAuth';
import { adminPatch } from '../../../../../lib/directusAdmin';
import { getFile, completeMultipartUpload, createThumbnail } from '../../../../../lib/platformFiles';

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
    // Videos will go through compression (status "processing") once that
    // service exists; until then everything is ready as uploaded.
    const thumb_key = file.kind === 'image' ? await createThumbnail({ storage_key: file.storage_key, size }) : null;
    await adminPatch(`/items/platform_files/${file.id}`, { status: 'ready', size, upload_id: null, thumb_key });
    return json({ id: file.id, status: 'ready' });
  } catch (e: any) {
    console.error('Upload complete failed:', e);
    return json({ error: 'upload_failed' }, 500);
  }
};
