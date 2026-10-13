import type { APIRoute } from 'astro';
import { requireMember } from '../../../../lib/platformAuth';
import { getMaterial, isTracked, recordProgress } from '../../../../lib/materialViews';

// Player heartbeat from /platform/view/[id]: POST { delta, position, duration } (seconds).
export const POST: APIRoute = async ({ request, params }) => {
  const member = await requireMember(request);
  if (!member) return new Response(null, { status: 401 });
  const material = await getMaterial(Number(params.id));
  if (!material || !isTracked(member, material)) return new Response(null, { status: 204 });
  const body = await request.json().catch(() => ({}));
  const num = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0);
  await recordProgress(member.id, material.id, num(body.delta), num(body.position), num(body.duration));
  return new Response(null, { status: 204 });
};
