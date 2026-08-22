import type { APIRoute } from 'astro';
import { adminGet, adminPatch } from '../../../lib/directusAdmin';

export const POST: APIRoute = async ({ request }) => {
  const { pw, member_id, workshop_id, cloud_ids } = await request.json();

  const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD ?? '';
  if (!ADMIN_PASSWORD || pw !== ADMIN_PASSWORD) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!member_id) {
    return new Response(JSON.stringify({ error: 'Missing member_id' }), { status: 400 });
  }

  try {
    const body: Record<string, unknown> = { workshop: workshop_id ?? null };

    if (Array.isArray(cloud_ids)) {
      // The M2M field only accepts the explicit nested create/update/delete
      // form on this Directus setup — the bare-array shorthand 403s.
      const current = await adminGet(
        `/items/platform_members/${member_id}?fields=clouds.id,clouds.clouds_id`
      );
      const existing: Array<{ id: number; clouds_id: number }> = current.data?.clouds ?? [];
      const desired = new Set<number>(cloud_ids);
      const existingCloudIds = new Set(existing.map((e) => e.clouds_id));

      const toCreate = cloud_ids.filter((id: number) => !existingCloudIds.has(id));
      const toDelete = existing.filter((e) => !desired.has(e.clouds_id)).map((e) => e.id);

      body.clouds = {
        create: toCreate.map((id: number) => ({ clouds_id: id })),
        update: [],
        delete: toDelete,
      };
    }

    await adminPatch(`/items/platform_members/${member_id}`, body);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    console.error('Assign error:', e?.message);
    return new Response(JSON.stringify({ error: e?.message ?? 'Failed to assign' }), { status: 500 });
  }
};
