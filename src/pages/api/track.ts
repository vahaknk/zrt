import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { visitor_id, language } = await request.json();

    const referrer = request.headers.get('referer') ?? '';
    const user_agent = request.headers.get('user-agent') ?? '';

    // Cloudflare (sitting in front of the app) already resolves the visitor's
    // IP to a country on every request via this header — no need to ship the
    // IP off to a third party (ipapi.co) just to get the same answer.
    let country = '';
    const countryCode = request.headers.get('cf-ipcountry') ?? '';
    if (countryCode && countryCode !== 'XX' && countryCode !== 'T1') {
      try {
        country = new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode) ?? '';
      } catch {}
    }

    const DIRECTUS_URL = import.meta.env.DIRECTUS_URL;
    const DIRECTUS_TOKEN = import.meta.env.DIRECTUS_TOKEN;

    await fetch(`${DIRECTUS_URL}/items/Visits`, {
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
