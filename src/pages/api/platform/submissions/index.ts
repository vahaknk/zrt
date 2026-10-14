import type { APIRoute } from 'astro';
import { requireMember } from '../../../../lib/platformAuth';
import { adminPost } from '../../../../lib/directusAdmin';
import { enrolledInGroup, attachableFile } from '../../../../lib/submissions';
import { notify, groupFacilitatorIds } from '../../../../lib/notifications';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

// A participant sends work to one of their workshops/clouds.
// POST { workshop | cloud, note?, file? } — at least a note or a file.
export const POST: APIRoute = async ({ request }) => {
  const member = await requireMember(request);
  if (!member) return json({ error: 'Unauthorized' }, 401);

  const body = await request.json().catch(() => ({}));
  const workshop = body.workshop ? Number(body.workshop) : null;
  const cloud = body.cloud ? Number(body.cloud) : null;
  const note = String(body.note ?? '').trim().slice(0, 5000);
  const fileId = String(body.file ?? '').trim();
  if ((!workshop && !cloud) || (workshop && cloud)) return json({ error: 'Provide exactly one of workshop or cloud' }, 400);
  if (!note && !fileId) return json({ error: 'empty' }, 400);
  if (!enrolledInGroup(member, workshop, cloud)) return json({ error: 'Forbidden' }, 403);
  if (fileId && !(await attachableFile(member, fileId, 'submission'))) return json({ error: 'File not found' }, 400);

  const now = new Date().toISOString();
  const created = await adminPost('/items/submissions', {
    author: member.id,
    participant: member.id,
    workshop,
    cloud,
    note: note || null,
    file: fileId || null,
    last_activity: now,
  });
  await notify(await groupFacilitatorIds(workshop, cloud), 'submission', { actor: member.id, submission: created.data.id });
  return json({ id: created.data.id });
};
