import { createDirectus, rest, authentication, login } from '@directus/sdk';

const DIRECTUS_URL = import.meta.env.DIRECTUS_URL as string;

export async function loginUser(email: string, password: string) {
  const client = createDirectus(DIRECTUS_URL)
    .with(authentication('json'))
    .with(rest());

  const result = await client.login(email, password);
  return result; // { access_token, refresh_token, expires }
}

export function getAuthToken(request: Request): string | null {
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.match(/directus_token=([^;]+)/);
  return match ? match[1] : null;
}