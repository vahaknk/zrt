const DIRECTUS_URL = import.meta.env.DIRECTUS_URL as string;
const DIRECTUS_TOKEN = import.meta.env.DIRECTUS_TOKEN as string;

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
  };
}

export async function adminGet(path: string) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, { headers: headers() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Directus GET ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

export async function adminPatch(path: string, body: object) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Directus PATCH ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}