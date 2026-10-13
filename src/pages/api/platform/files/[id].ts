import type { APIRoute } from 'astro';
import { requireMember, hasFacilitatorPage } from '../../../../lib/platformAuth';
import { adminGet, adminDelete, adminPatch } from '../../../../lib/directusAdmin';
import { getFile, canViewFile, downloadUrl, thumbnailUrl, deleteObject, abortMultipartUpload } from '../../../../lib/platformFiles';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

// Opens a file: checks access, then redirects to a short-lived link straight
// to the bucket (?download=1 saves it instead of showing it).
export const GET: APIRoute = async ({ request, params, url, redirect }) => {
  const member = await requireMember(request);
  if (!member) return redirect('/platform/login');
  const file = await getFile(String(params.id));
  if (!file || file.status === 'uploading' || !(await canViewFile(member, file))) {
    return new Response('Not found', { status: 404 });
  }
  // ?thumb=1: the small preview (images), when there is one.
  if (url.searchParams.has('thumb')) {
    const thumb = await thumbnailUrl(file);
    if (!thumb) return new Response('Not found', { status: 404 });
    const res = redirect(thumb, 302);
    res.headers.set('Cache-Control', 'private, max-age=3600');
    return res;
  }
  // Saving a library file needs the facilitator's permission (staff always may);
  // without it the file is still shown/played, just not offered as a download.
  const wantsDownload = url.searchParams.has('download');
  const mayDownload =
    file.purpose !== 'library' || file.allow_download || file.owner === member.id || hasFacilitatorPage(member);
  const res = redirect(await downloadUrl(file, wantsDownload && mayDownload), 302);
  res.headers.set('Cache-Control', 'private, no-store');
  return res;
};

// The owner switches "participants may download" on or off. PATCH { allow_download }.
export const PATCH: APIRoute = async ({ request, params }) => {
  const member = await requireMember(request);
  if (!member) return json({ error: 'Unauthorized' }, 401);
  const file = await getFile(String(params.id));
  if (!file || file.owner !== member.id || file.purpose !== 'library') return json({ error: 'Not found' }, 404);
  const body = await request.json().catch(() => ({}));
  await adminPatch(`/items/platform_files/${file.id}`, { allow_download: !!body.allow_download });
  return json({ success: true });
};

// Removes a file from the owner's library — refused while a material uses it.
export const DELETE: APIRoute = async ({ request, params }) => {
  const member = await requireMember(request);
  if (!member) return json({ error: 'Unauthorized' }, 401);
  const file = await getFile(String(params.id));
  if (!file || file.owner !== member.id) return json({ error: 'Not found' }, 404);
  const uses = await Promise.all(
    ['materials', 'submissions', 'submission_replies'].map((c) => adminGet(`/items/${c}?filter[file][_eq]=${file.id}&fields=id&limit=1`))
  );
  if (uses.some((u) => (u.data ?? []).length)) return json({ error: 'in_use' }, 409);
  try {
    if (file.upload_id) await abortMultipartUpload(file.storage_key, file.upload_id);
    else await deleteObject(file.storage_key);
    if (file.thumb_key) await deleteObject(file.thumb_key).catch(() => {});
    await adminDelete(`/items/platform_files/${file.id}`);
    return json({ success: true });
  } catch (e: any) {
    console.error('File delete failed:', e);
    return json({ error: 'delete_failed' }, 500);
  }
};
