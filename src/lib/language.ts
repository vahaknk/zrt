export const LANG_COOKIE = 'zrt_lang';

export function getLanguage(request: Request): string {
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.match(new RegExp(`${LANG_COOKIE}=([^;]+)`));
  return match ? match[1] : 'hyw';
}

export function setLanguageCookie(lang: string): string {
  return `${LANG_COOKIE}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
}