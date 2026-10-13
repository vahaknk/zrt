import type { APIRoute } from 'astro';
import { requireMember } from '../../../../../lib/platformAuth';
import { adminPost, adminPatch } from '../../../../../lib/directusAdmin';
import { getSubmission, canSeeSubmission, attachableFile } from '../../../../../lib/submissions';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

// A reply on a submission, by its author, the group's facilitators or the
// team. POST { text?, file? } — at least one.
export const POST: APIRoute = async ({ request, params }) => {
  const member = await requireMember(request);
  if (!member) return json({ error: 'Unauthorized' }, 401);
  const sub = await getSubmission(Number(params.id));
  if (!sub || !canSeeSubmission(member, sub)) return json({ error: 'Not found' }, 404);

  const body = await request.json().catch(() => ({}));
  const text = String(body.text ?? '').trim().slice(0, 5000);
  const fileId = String(body.file ?? '').trim();
  if (!text && !fileId) return json({ error: 'empty' }, 400);
  if (fileId && !(await attachableFile(member, fileId, 'reply'))) return json({ error: 'File not found' }, 400);

  const created = await adminPost('/items/submission_replies', {
    submission: sub.id,
    author: member.id,
    text: text || null,
    file: fileId || null,
  });
  await adminPatch(`/items/submissions/${sub.id}`, { last_activity: new Date().toISOString() });
  return json({ id: created.data.id });
};
