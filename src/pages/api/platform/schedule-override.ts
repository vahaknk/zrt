import type { APIRoute } from 'astro';
import { requireMember, canManageWorkshopOrCloud } from '../../../lib/platformAuth';
import { adminPost } from '../../../lib/directusAdmin';

export const POST: APIRoute = async ({ request }) => {
  const member = await requireMember(request);
  if (!member) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { date, workshop_id, cloud_id, note } = await request.json();

  const dateStr = String(date ?? '').trim();
  const workshop = workshop_id ? Number(workshop_id) : null;
  const cloud = cloud_id ? Number(cloud_id) : null;

  if (!dateStr) {
    return new Response(JSON.stringify({ error: 'Missing date' }), { status: 400 });
  }
  if ((!workshop && !cloud) || (workshop && cloud)) {
    return new Response(JSON.stringify({ error: 'Provide exactly one of workshop or cloud' }), { status: 400 });
  }
  if (!canManageWorkshopOrCloud(member, workshop, cloud)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  try {
    const created = await adminPost('/items/schedule_overrides', {
      date: dateStr,
      workshop,
      cloud,
      note: note ? String(note).trim() : null,
      active: true,
    });
    return new Response(JSON.stringify({ success: true, id: created.data.id }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'Failed to create schedule override' }), { status: 500 });
  }
};
