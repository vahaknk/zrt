import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ request, cookies, redirect }) => {
  const url = new URL(request.url);
  const lang = url.searchParams.get('lang');
  if (lang) {
    cookies.set('zrt_lang', lang, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  }
  return redirect('/');
};