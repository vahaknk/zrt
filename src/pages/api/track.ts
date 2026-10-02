import type { APIRoute } from 'astro';

// Visit records are kept for 13 months (see /privacy, CNIL's ceiling for
// audience measurement). Older rows are purged at most once a day, piggybacking
// on the first visit recorded that day — no separate scheduler needed.
const RETENTION_MONTHS = 13;
const PURGE_EVERY_MS = 24 * 60 * 60 * 1000;
let lastPurge = 0;

async function purgeOldVisits(directusUrl: string, token: string) {
  const now = Date.now();
  if (now - lastPurge < PURGE_EVERY_MS) return;
  lastPurge = now;
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - RETENTION_MONTHS);
  try {
    await fetch(`${directusUrl}/items/Visits`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: { filter: { date_created: { _lt: cutoff.toISOString() } } } }),
    });
  } catch {
    lastPurge = 0; // try again on a later visit
  }
}

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

    await purgeOldVisits(DIRECTUS_URL, DIRECTUS_TOKEN);
  } catch {}

  return new Response(null, { status: 204 });
};
