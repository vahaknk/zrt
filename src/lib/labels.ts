import { directus, readItems } from './directus';

export async function getLabels(lang: string): Promise<Record<string, string>> {
  const items = await directus.request(
    readItems('UI_Labels' as any, {
      // Without an explicit limit, Directus caps the response at its default
      // page size (100) — invisible while this collection was small, but it
      // started silently dropping public-site labels once the platform's own
      // UI_Labels rows (a separate, unrelated group) pushed the total past
      // that cap. Excluding that group here is belt-and-suspenders: the
      // public site never needs those rows, so it shouldn't fetch them (or
      // be at risk of this same cutoff) as that group keeps growing.
      filter: { group: { _neq: 'platform' } } as any,
      limit: -1,
      fields: ['key', { translations: ['languages_id', 'value'] }] as any,
      deep: {
        translations: { _filter: { languages_id: { _eq: lang } } },
      },
    } as any)
  ) as any[];

  const map: Record<string, string> = {};
  for (const item of items) {
    const t = item.translations?.[0];
    if (t?.value) map[item.key] = t.value;
  }
  return map;
}