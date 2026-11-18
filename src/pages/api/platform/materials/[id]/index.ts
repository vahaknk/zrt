import type { APIRoute } from 'astro';
import { requireMember, isWebUrl } from '../../../../../lib/platformAuth';
import { adminPatch } from '../../../../../lib/directusAdmin';
import { getMaterial } from '../../../../../lib/materialViews';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

// A moderator corrects a facilitator's material, before or after approving
// it. PATCH { label, text?, url? } — text only on written materials, url only
// on links; an uploaded file itself can't be changed, only its title.
export const PATCH: APIRoute = async ({ request, params }) => {
  const member = await requireMember(request);
  if (!member) return json({ error: 'Unauthorized' }, 401);
  if (!member.moderator) return json({ error: 'Forbidden' }, 403);
  const material = await getMaterial(Number(params.id));
  if (!material) return json({ error: 'Not found' }, 404);

  const body = await request.json().catch(() => ({}));
  const label = String(body.label ?? '').trim();
  if (!label) return json({ error: 'The title is empty' }, 400);
  const patch: Record<string, string> = { label };
  if (material.text) {
    const text = String(body.text ?? '').trim().slice(0, 20000);
    if (!text) return json({ error: 'The text is empty' }, 400);
    patch.text = text;
  } else if (!material.file) {
    const url = String(body.url ?? '').trim();
    // Students open these links — only web addresses.
    if (!isWebUrl(url)) return json({ error: 'The link must start with http:// or https://' }, 400);
    patch.url = url;
  }
  try {
    await adminPatch(`/items/materials/${material.id}`, patch);
    return json({ success: true });
  } catch (e: any) {
    return json({ error: e?.message ?? 'Failed to save' }, 500);
  }
};
