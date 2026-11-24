import type { APIRoute } from 'astro';
import { requireMember } from '../../../../lib/platformAuth';
import { adminPost } from '../../../../lib/directusAdmin';
import { facilitatesGroup, enrolledInGroup, attachableFile } from '../../../../lib/submissions';
import { notify, groupStudentIds, groupFacilitatorIds } from '../../../../lib/notifications';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

// A facilitator (or team member) starts a conversation with one participant
// of their group — POST { participant, workshop | cloud, note?, file? } —
// or a participant with one facilitator of theirs: POST { to, workshop | cloud, note?, file? }.
export const POST: APIRoute = async ({ request }) => {
  const member = await requireMember(request);
  if (!member) return json({ error: 'Unauthorized' }, 401);

  const body = await request.json().catch(() => ({}));
  const participant = Number(body.participant);
  const to = Number(body.to);
  const workshop = body.workshop ? Number(body.workshop) : null;
  const cloud = body.cloud ? Number(body.cloud) : null;
  const note = String(body.note ?? '').trim().slice(0, 5000);
  const fileId = String(body.file ?? '').trim();
  if ((!participant && !to) || (!workshop && !cloud) || (workshop && cloud)) return json({ error: 'Bad request' }, 400);
  if (!note && !fileId) return json({ error: 'empty' }, 400);

  if (to) {
    if (!enrolledInGroup(member, workshop, cloud)) return json({ error: 'Forbidden' }, 403);
    if (!(await groupFacilitatorIds(workshop, cloud)).includes(to)) return json({ error: 'Not a facilitator of this group' }, 400);
    // Attached like work sent to the group.
    if (fileId && !(await attachableFile(member, fileId, 'submission'))) return json({ error: 'File not found' }, 400);
    const created = await adminPost('/items/submissions', {
      author: member.id,
      participant: member.id,
      recipient: to,
      workshop,
      cloud,
      note: note || null,
      file: fileId || null,
      last_activity: new Date().toISOString(),
    });
    await notify([to], 'message', { actor: member.id, submission: created.data.id });
    return json({ id: created.data.id });
  }

  if (member.role !== 'team' && !facilitatesGroup(member, workshop, cloud)) return json({ error: 'Forbidden' }, 403);
  if (!(await groupStudentIds(workshop, cloud)).includes(participant)) return json({ error: 'Not a participant of this group' }, 400);
  // Like replies, a facilitator's file in a conversation isn't reviewed.
  if (fileId && !(await attachableFile(member, fileId, 'reply'))) return json({ error: 'File not found' }, 400);

  const created = await adminPost('/items/submissions', {
    author: member.id,
    participant,
    workshop,
    cloud,
    note: note || null,
    file: fileId || null,
    last_activity: new Date().toISOString(),
  });
  await notify([participant], 'message', { actor: member.id, submission: created.data.id });
  return json({ id: created.data.id });
};
