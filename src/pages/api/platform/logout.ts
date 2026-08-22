import type { APIRoute } from 'astro';
import { adminPatch } from '../../../lib/directusAdmin';
import { requireMember, SESSION_COOKIE } from '../../../lib/platformAuth';

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const member = await requireMember(request);
  if (member) {
    try {
      await adminPatch(`/items/platform_members/${member.id}`, {
        session_token: null,
        session_expires_at: null,
      });
    } catch {
      // Non-critical — clearing the cookie below still logs the browser out.
    }
  }
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return redirect('/platform/login');
};
