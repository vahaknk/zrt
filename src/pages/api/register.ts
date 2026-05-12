import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  
  // Strip empty strings and undefined values — Directus prefers omitted fields over empty
  const cleanBody = Object.fromEntries(
    Object.entries(body).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
  );
  
  // Cast armenian_level to number if present
  if (cleanBody.armenian_level !== undefined) {
    cleanBody.armenian_level = Number(cleanBody.armenian_level);
  }
  
  console.log('=== /api/register called ===');
  console.log('Sending to Directus:', JSON.stringify(cleanBody, null, 2));
  
  const res = await fetch(`${import.meta.env.DIRECTUS_URL}/items/registration_requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanBody),
  });
  
  console.log('Directus response status:', res.status);
  
  if (!res.ok) {
    const errText = await res.text();
    console.log('Directus error body:', errText);
    return new Response(JSON.stringify({ error: errText }), { status: res.status });
  }
  
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};