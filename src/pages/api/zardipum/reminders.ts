import type { APIRoute } from 'astro';
import { hookAuthorized, sendDueReminders } from '../../../lib/zardipum';

// Called every 5 minutes by the Directus Flow "Zardipum: reminders"; emails
// participants of meetings starting within the next hour, once.
export const POST: APIRoute = async ({ request }) => {
  if (!hookAuthorized(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  return new Response(JSON.stringify({ sent: await sendDueReminders() }), { status: 200 });
};
