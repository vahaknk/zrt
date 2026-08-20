const NOTION_VERSION = '2022-06-28';

// interview_language codes -> the Armenian labels already used in the
// Notion "Տեսակցութեան լեզու" select. Codes without an existing option
// (de/it/tr) get a new option auto-created by Notion using this label.
const LANGUAGE_LABELS: Record<string, string> = {
  hyw: 'Հայերէն',
  en: 'Անգլերէն',
  fr: 'Ֆրանսերէն',
  de: 'Գերմաներէն',
  it: 'Իտալերէն',
  tr: 'Թրքերէն',
};

interface BookingSyncParams {
  fullName: string;
  city: string | null;
  interviewLanguage: string | null;
  slotStartTime: string; // naive "YYYY-MM-DDTHH:mm:ss", already Paris wall-clock time
}

export async function syncBookingToNotion(params: BookingSyncParams): Promise<void> {
  const properties: Record<string, unknown> = {
    'Անուն': { title: [{ text: { content: params.fullName } }] },
    'Օր եւ ժամ (Փարիզի ժամով)': {
      date: { start: params.slotStartTime, time_zone: 'Europe/Paris' },
    },
  };

  if (params.city) {
    properties['Քաղաք'] = { select: { name: params.city } };
  }
  if (params.interviewLanguage) {
    const label = LANGUAGE_LABELS[params.interviewLanguage] ?? params.interviewLanguage;
    properties['Տեսակցութեան լեզու'] = { select: { name: label } };
  }

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: import.meta.env.NOTION_DATABASE_ID },
      properties,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion sync failed: ${res.status} ${text}`);
  }
}
