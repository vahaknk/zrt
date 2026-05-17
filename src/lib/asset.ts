export function asset(directusUrl: string, id: string | null): string | null {
  return id ? `${directusUrl}/assets/${id}` : null;
}

export function fileUrl(directusUrl: string, id: string): string {
  return `${directusUrl}/assets/${id}`;
}
