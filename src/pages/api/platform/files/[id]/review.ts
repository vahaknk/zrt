import type { APIRoute } from 'astro';
import { requireMember } from '../../../../../lib/platformAuth';
import { getFile } from '../../../../../lib/platformFiles';
import { decideReview } from '../../../../../lib/moderation';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

// A moderator approves or rejects a library file. POST { decision: "approve" | "reject", note? }.
export const POST: APIRoute = async ({ request, params }) => {
  const member = await requireMember(request);
  if (!member) return json({ error: 'Unauthorized' }, 401);
  if (!member.moderator) return json({ error: 'Forbidden' }, 403);
  const file = await getFile(String(params.id));
  if (!file || file.purpose !== 'library') return json({ error: 'Not found' }, 404);
  const body = await request.json().catch(() => ({}));
  if (body.decision !== 'approve' && body.decision !== 'reject') return json({ error: 'Bad decision' }, 400);
  const note = String(body.note ?? '').trim().slice(0, 1000);
  await decideReview(file, member, body.decision === 'approve', note);
  return json({ success: true });
};
