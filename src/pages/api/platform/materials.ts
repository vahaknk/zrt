import type { APIRoute } from 'astro';
import { requireMember, canManageWorkshopOrCloud } from '../../../lib/platformAuth';
import { adminGet, adminPost, adminDelete } from '../../../lib/directusAdmin';

const TYPES = ['video', 'audio', 'reading'] as const;

export const POST: APIRoute = async ({ request }) => {
  const member = await requireMember(request);
  if (!member) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const body = await request.json();
  const workshop = body.workshop ? Number(body.workshop) : null;
  const cloud = body.cloud ? Number(body.cloud) : null;
  const weekStart = String(body.week_start ?? '').trim();
  const type = String(body.type ?? '').trim();
  const label = String(body.label ?? '').trim();
  const url = String(body.url ?? '').trim();

  if ((!workshop && !cloud) || (workshop && cloud)) {
    return new Response(JSON.stringify({ error: 'Provide exactly one of workshop or cloud' }), { status: 400 });
  }
  if (!weekStart || !TYPES.includes(type as any) || !label || !url) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }
  if (!canManageWorkshopOrCloud(member, workshop, cloud)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  try {
    const created = await adminPost('/items/materials', {
      workshop,
      cloud,
      week_start: weekStart,
      type,
      label,
      url,
    });
    return new Response(JSON.stringify({ success: true, id: created.data.id }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'Failed to create material' }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const member = await requireMember(request);
  if (!member) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const body = await request.json();
  const id = Number(body.id);
  if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });

  let material: any = null;
  try {
    const res = await adminGet(`/items/materials/${id}?fields=id,workshop,cloud`);
    material = res.data;
  } catch {
    return new Response(JSON.stringify({ error: 'Material not found' }), { status: 404 });
  }
  if (!material) return new Response(JSON.stringify({ error: 'Material not found' }), { status: 404 });

  if (!canManageWorkshopOrCloud(member, material.workshop ?? null, material.cloud ?? null)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  try {
    await adminDelete(`/items/materials/${id}`);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'Failed to delete material' }), { status: 500 });
  }
};
