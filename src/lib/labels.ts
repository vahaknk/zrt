import { directus, readItems } from './directus';

export async function getLabels(lang: string): Promise<Record<string, string>> {
  const items = await directus.request(
    readItems('UI_Labels' as any, {
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