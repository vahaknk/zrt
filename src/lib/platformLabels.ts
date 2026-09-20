import { adminGet } from './directusAdmin';

// Platform UI text lives in Directus (UI_Labels, group="platform") so it can
// be edited without a code change. Each key has exactly one translation row
// (the platform isn't multi-language — the row's languages_id just records
// which language that particular string happens to be in). A missing key
// (not yet created, or Directus unreachable) falls back to the literal
// passed at the call site, so a page never breaks waiting on a label.
export async function getPlatformLabels(): Promise<Record<string, string>> {
  try {
    const res = await adminGet(
      `/items/UI_Labels?filter[group][_eq]=platform&fields=key,translations.value&limit=-1`
    );
    const map: Record<string, string> = {};
    for (const item of (res.data ?? []) as Array<{ key: string; translations: Array<{ value: string | null }> }>) {
      const value = item.translations?.[0]?.value;
      if (value) map[item.key] = value;
    }
    return map;
  } catch {
    return {};
  }
}

export type PlatformLabels = Record<string, string>;

export function makeLabelGetter(labels: PlatformLabels) {
  return (key: string, fallback: string) => labels[key] ?? fallback;
}
