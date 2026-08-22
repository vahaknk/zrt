import type { APIRoute } from 'astro';
import { hashPassword } from '../../../lib/platformAuth';

// Internal endpoint for the Directus Flow that auto-creates platform_members
// on enrollment. Directus's sandboxed "Run Script" operation can't run
// crypto.scrypt/pbkdf2/createHash (confirmed by testing) — only
// crypto.randomBytes works there — so the Flow generates the plaintext
// password itself and calls back here to do the actual hashing with a real,
// unrestricted Node runtime.
export const POST: APIRoute = async ({ request }) => {
  const { pw, password } = await request.json();

  const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD ?? '';
  if (!ADMIN_PASSWORD || pw !== ADMIN_PASSWORD) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!password) {
    return new Response(JSON.stringify({ error: 'Missing password' }), { status: 400 });
  }

  const hash = await hashPassword(password);
  return new Response(JSON.stringify({ hash }), { status: 200 });
};
