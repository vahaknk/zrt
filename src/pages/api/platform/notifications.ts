import type { APIRoute } from 'astro';
import { requireMember } from '../../../lib/platformAuth';
import { unreadCount, listNotifications, notificationText } from '../../../lib/notifications';
import { getPlatformLabels, makeLabelGetter } from '../../../lib/platformLabels';

// Polled by the platform header: the unread count and the newest unread
// notifications (for the bell badge and the "something new" pop-up).
export const GET: APIRoute = async ({ request }) => {
  const member = await requireMember(request);
  if (!member) return new Response(null, { status: 401 });
  const L = makeLabelGetter(await getPlatformLabels());
  const [count, latest] = await Promise.all([unreadCount(member.id), listNotifications(member.id, { unreadOnly: true, limit: 5 })]);
  return new Response(
    JSON.stringify({ count, latest: latest.map((n) => ({ id: n.id, text: notificationText(n, L) })) }),
    { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
  );
};
