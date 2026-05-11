import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  const res = await fetch(`${import.meta.env.DIRECTUS_URL}/items/registration_requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    return new Response(JSON.stringify({ error: err }), { status: res.status });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};