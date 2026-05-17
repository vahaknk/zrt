export function getLanguage(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get('lang');
}