import type { APIRoute } from 'astro';
import { hookAuthorized } from '../../../lib/zardipum';
import { handlePublish } from '../../../lib/publishing';

// Called by the Directus Flow "Platform: publish Բարեւ / Լրատու" whenever a
// video or news post is saved. Body: the Flow trigger ({ collection, key(s) }).
export const POST: APIRoute = async ({ request }) => {
  if (!hookAuthorized(request)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const body = await request.json().catch(() => ({}));
  const collection = String(body.collection ?? '');
  if (collection !== 'parev_videos' && collection !== 'news') return new Response(JSON.stringify({ skipped: collection }), { status: 200 });
  const ids = [...new Set([body.key, ...(Array.isArray(body.keys) ? body.keys : [])].map(Number).filter((n) => n > 0))];
  const results: Record<number, string[]> = {};
  for (const id of ids) results[id] = await handlePublish(collection, id).catch((e) => [`failed: ${e?.message}`]);
  return new Response(JSON.stringify({ results }), { status: 200 });
};
