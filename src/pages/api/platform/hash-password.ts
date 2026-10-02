import type { APIRoute } from 'astro';
import { generateUniqueUsername, generateRandomPassword } from '../../../lib/platformAuth';

// Internal endpoint for the Directus Flow that auto-creates platform_members
// on enrollment. Directus's sandboxed "Run Script" operation can't reliably
// run any crypto module function (randomBytes proved unreliable there) — so
// the password and username are generated here, in a real, unrestricted Node
// runtime. If a password is provided it's returned as-is; otherwise one is
// generated. (Passwords are no longer hashed — the name is kept because the
// flow calls this URL.)
export const POST: APIRoute = async ({ request }) => {
  const { pw, password: providedPassword, full_name } = await request.json();

  const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD ?? '';
  if (!ADMIN_PASSWORD || pw !== ADMIN_PASSWORD) {
    return new Response('Unauthorized', { status: 401 });
  }

  const password = providedPassword || generateRandomPassword();

  const username = full_name ? await generateUniqueUsername(full_name) : undefined;
  return new Response(JSON.stringify({ password, username }), { status: 200 });
};
