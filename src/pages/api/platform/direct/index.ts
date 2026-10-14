import type { APIRoute } from 'astro';
import { requireMember, hasFacilitatorPage } from '../../../../lib/platformAuth';
import { adminGet, adminPost } from '../../../../lib/directusAdmin';
import { attachableFile } from '../../../../lib/submissions';
import { notify } from '../../../../lib/notifications';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

// A facilitator/team member starts a personal conversation with another.
// POST { to, note?, file? }. Not tied to a group; only the two of them see it.
export const POST: APIRoute = async ({ request }) => {
  const member = await requireMember(request);
  if (!member) return json({ error: 'Unauthorized' }, 401);
  if (member.role !== 'facilitator' && member.role !== 'team' && !hasFacilitatorPage(member)) return json({ error: 'Forbidden' }, 403);

  const body = await request.json().catch(() => ({}));
  const to = Number(body.to);
  const note = String(body.note ?? '').trim().slice(0, 5000);
  const fileId = String(body.file ?? '').trim();
  if (!to || to === member.id) return json({ error: 'Bad request' }, 400);
  if (!note && !fileId) return json({ error: 'empty' }, 400);
  const other = (await adminGet(`/items/platform_members/${to}?fields=id,role,status`).catch(() => ({ data: null }))).data;
  if (!other || other.status !== 'active' || (other.role !== 'facilitator' && other.role !== 'team')) return json({ error: 'Not found' }, 404);
  if (fileId && !(await attachableFile(member, fileId, 'reply'))) return json({ error: 'File not found' }, 400);

  const created = await adminPost('/items/submissions', {
    author: member.id,
    participant: to,
    workshop: null,
    cloud: null,
    note: note || null,
    file: fileId || null,
    last_activity: new Date().toISOString(),
  });
  await notify([to], 'message', { actor: member.id, submission: created.data.id });
  return json({ id: created.data.id });
};
