import type { APIRoute } from 'astro';
import { requireMember } from '../../../../../lib/platformAuth';
import { getNews, canSeeNews, directusFileUrl } from '../../../../../lib/publishing';

// A news post's picture (/image) or attachment (/attachment), for members it's for.
export const GET: APIRoute = async ({ request, params, redirect }) => {
  const member = await requireMember(request);
  if (!member) return redirect('/platform/login');
  const post = await getNews(Number(params.id));
  const file = params.which === 'image' ? post?.image : params.which === 'attachment' ? post?.attachment : null;
  if (!post || !file || !canSeeNews(member, post)) return new Response('Not found', { status: 404 });
  const url = await directusFileUrl(file.id, params.which === 'attachment');
  if (!url) return new Response('Not found', { status: 404 });
  const res = redirect(url, 302);
  res.headers.set('Cache-Control', 'private, max-age=3600');
  return res;
};
