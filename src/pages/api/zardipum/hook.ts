import type { APIRoute } from 'astro';
import { BOOKKEEPING_FIELDS, hookAuthorized, reconcileMeeting } from '../../../lib/zardipum';

// Called by the Directus Flow "Zardipum: notify participants" on every
// create/update of a զարդիպում. Body: { key?, keys?, payload? } straight
// from the Flow trigger.
export const POST: APIRoute = async ({ request }) => {
  if (!hookAuthorized(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const payloadKeys = Object.keys(body.payload && typeof body.payload === 'object' ? body.payload : {});
  if (payloadKeys.length && payloadKeys.every((k) => BOOKKEEPING_FIELDS.has(k))) {
    return new Response(JSON.stringify({ skipped: 'bookkeeping only' }), { status: 200 });
  }
  const ids = [...new Set([body.key, ...(Array.isArray(body.keys) ? body.keys : [])].map(Number).filter((n) => n > 0))];
  const results: Record<number, string[]> = {};
  for (const id of ids) results[id] = await reconcileMeeting(id);
  return new Response(JSON.stringify({ results }), { status: 200 });
};
