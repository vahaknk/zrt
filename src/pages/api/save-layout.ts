import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { pw, section_id, breakpoint, config } = await request.json();

    const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD ?? '';
    if (!ADMIN_PASSWORD || pw !== ADMIN_PASSWORD) {
      return new Response('Unauthorized', { status: 401 });
    }

    const DIRECTUS_URL = import.meta.env.DIRECTUS_URL;
    const DIRECTUS_TOKEN = import.meta.env.DIRECTUS_TOKEN;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
    };

    // Find existing record
    const checkRes = await fetch(
      `${DIRECTUS_URL}/items/section_layouts?filter[section_id][_eq]=${section_id}&filter[breakpoint][_eq]=${breakpoint}&limit=1`,
      { headers }
    );
    const checkData = await checkRes.json();
    const existing = checkData.data?.[0];

    if (existing) {
      await fetch(`${DIRECTUS_URL}/items/section_layouts/${existing.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ config }),
      });
    } else {
      await fetch(`${DIRECTUS_URL}/items/section_layouts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ section_id, breakpoint, config }),
      });
    }

    return new Response(null, { status: 204 });
  } catch {
    return new Response('Error', { status: 500 });
  }
};
