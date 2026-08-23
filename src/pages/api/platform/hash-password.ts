import type { APIRoute } from 'astro';
import { randomBytes } from 'crypto';
import { hashPassword } from '../../../lib/platformAuth';

// Internal endpoint for the Directus Flow that auto-creates platform_members
// on enrollment. Directus's sandboxed "Run Script" operation can't reliably
// run any crypto module function (scrypt/pbkdf2/createHash all confirmed
// failing there, and randomBytes proved unreliable too) — so both
// generating the plaintext password AND hashing it happen here, in a real,
// unrestricted Node runtime. If a password is provided, it's hashed as-is
// (used by the admin-tool create-member flow); otherwise one is generated.
export const POST: APIRoute = async ({ request }) => {
  const { pw, password: providedPassword } = await request.json();

  const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD ?? '';
  if (!ADMIN_PASSWORD || pw !== ADMIN_PASSWORD) {
    return new Response('Unauthorized', { status: 401 });
  }

  const password = providedPassword || randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);

  const hash = await hashPassword(password);
  return new Response(JSON.stringify({ password, hash }), { status: 200 });
};
