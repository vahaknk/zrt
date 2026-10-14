import type { APIRoute } from 'astro';
import { requireMember } from '../../../../../lib/platformAuth';
import { getMaterial } from '../../../../../lib/materialViews';
import { decideMaterialReview } from '../../../../../lib/moderation';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

// A moderator approves or rejects a text material. POST { decision: "approve" | "reject", note? }.
export const POST: APIRoute = async ({ request, params }) => {
  const member = await requireMember(request);
  if (!member) return json({ error: 'Unauthorized' }, 401);
  if (!member.moderator) return json({ error: 'Forbidden' }, 403);
  const material = await getMaterial(Number(params.id));
  if (!material || !material.text) return json({ error: 'Not found' }, 404);
  const body = await request.json().catch(() => ({}));
  if (body.decision !== 'approve' && body.decision !== 'reject') return json({ error: 'Bad decision' }, 400);
  await decideMaterialReview(material, member, body.decision === 'approve', String(body.note ?? '').trim().slice(0, 1000));
  return json({ success: true });
};
