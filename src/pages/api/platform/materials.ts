import type { APIRoute } from 'astro';
import { requireMember, canManageWorkshopOrCloud, isWebUrl } from '../../../lib/platformAuth';
import { adminGet, adminPost, adminDelete } from '../../../lib/directusAdmin';
import { getFile, isApproved } from '../../../lib/platformFiles';
import { notify, groupStudentIds } from '../../../lib/notifications';
import { needsReview, requestMaterialReview } from '../../../lib/moderation';

const TYPES = ['video', 'audio', 'reading', 'reminder'] as const;

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
  const fileId = String(body.file ?? '').trim();
  const text = String(body.text ?? '').trim().slice(0, 20000);

  if ((!workshop && !cloud) || (workshop && cloud)) {
    return new Response(JSON.stringify({ error: 'Provide exactly one of workshop or cloud' }), { status: 400 });
  }
  // Exactly one source: a link, a file from the library, or a written text.
  if (!weekStart || !TYPES.includes(type as any) || !label || [url, fileId, text].filter(Boolean).length !== 1) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }
  // «Յիշեցում» (reminder) materials are written text only.
  if (type === 'reminder' && !text) {
    return new Response(JSON.stringify({ error: 'A reminder must be a written text' }), { status: 400 });
  }
  // Students open these links — anything but a web address (javascript:,
  // data:, …) could run code in their browser.
  if (url && !isWebUrl(url)) {
    return new Response(JSON.stringify({ error: 'The link must start with http:// or https://' }), { status: 400 });
  }
  if (!canManageWorkshopOrCloud(member, workshop, cloud)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }
  // Only a finished file from the facilitator's own library.
  let approved = true;
  if (fileId) {
    const file = await getFile(fileId);
    if (!file || file.owner !== member.id || file.purpose !== 'library' || file.status === 'uploading') {
      return new Response(JSON.stringify({ error: 'File not found' }), { status: 400 });
    }
    approved = isApproved(file);
  }

  // Written texts wait for the moderator, like uploaded files.
  const textReview = !!text && needsReview(member);
  if (textReview) approved = false;

  try {
    const created = await adminPost('/items/materials', {
      workshop,
      cloud,
      week_start: weekStart,
      type,
      label,
      url: url || null,
      file: fileId || null,
      text: text || null,
      author: member.id,
      ...(text ? { review_status: textReview ? 'pending' : 'approved' } : {}),
    });
    if (textReview) {
      await requestMaterialReview({ id: created.data.id, label, text }, member).catch((e) => console.error('requestMaterialReview failed:', e));
    }
    // A file still awaiting review: participants are told once it's approved.
    if (approved) await notify(await groupStudentIds(workshop, cloud), 'material', { actor: member.id, material: created.data.id });
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
