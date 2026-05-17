import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { visitor_id, language } = await request.json();

    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      '';

    const referrer = request.headers.get('referer') ?? '';
    const user_agent = request.headers.get('user-agent') ?? '';

    let country = '';
    const isLocal = !ip || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('::1');
    if (!isLocal) {
      try {
        const geo = await fetch(`https://ipapi.co/${ip}/json/`, {
          headers: { 'User-Agent': 'zartsants-tracker/1.0' },
        });
        const data = await geo.json();
        country = data.country_name ?? '';
      } catch {}
    }

    const DIRECTUS_URL = import.meta.env.DIRECTUS_URL;
    const DIRECTUS_TOKEN = import.meta.env.DIRECTUS_TOKEN;

    await fetch(`${DIRECTUS_URL}/items/visits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
      },
      body: JSON.stringify({ visitor_id, country, language, referrer, user_agent }),
    });
  } catch {}

  return new Response(null, { status: 204 });
};
