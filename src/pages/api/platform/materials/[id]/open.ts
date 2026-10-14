import type { APIRoute } from 'astro';
import { requireMember, isWebUrl } from '../../../../../lib/platformAuth';
import { getMaterial, canSeeMaterial, isTracked, recordOpen } from '../../../../../lib/materialViews';

// Link materials go through here so opening them is counted like files.
export const GET: APIRoute = async ({ request, params, redirect }) => {
  const member = await requireMember(request);
  if (!member) return redirect('/platform/login');
  const material = await getMaterial(Number(params.id));
  if (!material || !canSeeMaterial(member, material)) return redirect('/platform/library');
  if (material.file || material.text) return redirect(`/platform/view/${material.id}`);
  if (!isWebUrl(material.url)) return redirect('/platform/library');
  if (isTracked(member, material)) await recordOpen(member.id, material.id).catch(() => {});
  return redirect(material.url, 302);
};
