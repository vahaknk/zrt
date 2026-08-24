import { WEEKDAYS, PROFICIENCY_OPTIONS, INTEREST_OPTIONS, RELATIONSHIP_OPTIONS, type Weekday } from './minorFormContent';

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

// Exact Notion property names for database e24ad72f-b9ef-83c5-8e4e-0133bbe184c1
// (captured directly via GET /v1/databases/{id} — do not hand-edit).
const MINOR_FORM_PROPS = {
  title: "Ձեր անունը եւ մականունը 4\nVotre prénom et votre nom\nYour name and surname",
  participant_name: "Մասնակիցին անունը եւ մականունը\nPrénom et nom du/de la participant.e\nThe participant’s name and surname",
  birthday: "Մասնակիցին ծննդեան թուականը (օր-ամիս-տարի)\nDate de naissance du/de la  participant.e (JJ/MM/AAAA)\nThe participant’s birthday (DD/MM/YYYY)",
  school: "Յաճախած դպրոցը եւ դասարանը՝\nÉcole actuelle et niveau :\nCurrent school and grade/class:",
  town_country: "Երկիր եւ քաղաք\nVille et pays\nTown and country",
  city: "City",
  country: "Country",
  participant_type: "Participant Type",
  form_language: "Form Language",
  proficiency: "Մասնակիցին լեզուական պատրաստութիւնը՝\nMaîtrise de la langue par le/la participant.e :\nParticipant's language proficiency:",
  interests: "Մասնակիցին հետաքրքրութիւնները՝\nCentres d'intérêt du/de la participant.e :\nParticipant's interests:",
  relationship: "Ձեր կապը մասնակիցին հետ՝\nVotre lien avec le/la participant.e :\nYour relationship to the participant:",
  fee: "Տեղեակ եմ, որ Զարցանցը վճարովի ծրագիր մըն է եւ տարեկան վճարումը 1500 եւրօ է։    J’ai bien compris que Zartsants est un programme payant, au tarif annuel de 1500€ .\nI am aware that Zartsants is a paid program and the annual fee is €1,500.",
  monday: "Երկուշաբթի ո՞ր ժամերը յարմար են մասնակիցին համար։ Ժամերը ձեր տեղական ժամով դրուած են։\nLundi: quand est disponible le/la participant.e? Les heures sont exprimées dans votre fuseau horaire. \nWhich times on Monday work best for the participant? Times are listed in your local time.",
  tuesday: "Երեքշաբթի ո՞ր ժամերը յարմար են մասնակիցին համար։ Ժամերը ձեր տեղական ժամով դրուած են։\nMardi: quand est disponible le/la participant.e? Les heures sont exprimées dans votre fuseau horaire. \nWhich times on Tuesday work best for the participant? Times are listed in your local time.",
  wednesday: "Չորեքշաբթի ո՞ր ժամերը յարմար են մասնակիցին համար։ Ժամերը ձեր տեղական ժամով դրուած են։\nMercredi: quand est disponible le/la participant.e? Les heures sont exprimées dans votre fuseau horaire. \nWhich times on Wednesday work best for the participant? Times are listed in your local time.",
  thursday: "Հինգշաբթի ո՞ր ժամերը յարմար են մասնակիցին համար։ Ժամերը ձեր տեղական ժամով դրուած են։\nJeudi: quand est disponible le/la participant.e? Les heures sont exprimées dans votre fuseau horaire. \nWhich times on Thursday work best for the participant? Times are listed in your local time.",
  friday: "Ուրբաթ ո՞ր ժամերը յարմար են մասնակիցին համար։ Ժամերը ձեր տեղական ժամով դրուած են։\nVendredi: quand est disponible le/la participant.e? Les heures sont exprimées dans votre fuseau horaire. \nWhich times on Friday work best for the participant? Times are listed in your local time.",
  saturday: "Շաբաթ ո՞ր ժամերը յարմար են մասնակիցին համար։ Ժամերը ձեր տեղական ժամով դրուած են։\nSamedi : quand est disponible le/la participant.e? Les heures sont exprimées dans votre fuseau horaire. \nWhich times on Saturday work best for the participant? Times are listed in your local time.",
} as const;

const FORM_LANGUAGE_LABELS: Record<string, string> = {
  hyw: 'Armenian',
  fr: 'French',
  en: 'English',
};

interface MinorRegistrationSyncParams {
  respondentName: string;
  participantName: string;
  participantType: 'minor' | 'adult';
  participantBirthday: string | null;
  currentSchool: string | null;
  city: string | null;
  country: string | null;
  languageProficiency: string[]; // option `value`s from PROFICIENCY_OPTIONS
  interests: string[]; // option `value`s from INTEREST_OPTIONS
  relationship: string | null; // option `value` from RELATIONSHIP_OPTIONS
  feeAcknowledged: boolean;
  availability: Partial<Record<Weekday, string[]>>; // day -> exact slot strings (already match Notion option names)
  formLanguage: string | null; // hyw/fr/en
}

function richText(content: string) {
  return { rich_text: [{ text: { content } }] };
}

export async function syncMinorRegistrationToNotion(params: MinorRegistrationSyncParams): Promise<void> {
  const properties: Record<string, unknown> = {
    [MINOR_FORM_PROPS.title]: { title: [{ text: { content: params.respondentName } }] },
    [MINOR_FORM_PROPS.participant_name]: richText(params.participantName),
    [MINOR_FORM_PROPS.fee]: { checkbox: params.feeAcknowledged },
    [MINOR_FORM_PROPS.participant_type]: { select: { name: params.participantType === 'adult' ? 'Adult' : 'Minor' } },
  };

  if (params.participantBirthday) properties[MINOR_FORM_PROPS.birthday] = richText(params.participantBirthday);
  if (params.currentSchool) properties[MINOR_FORM_PROPS.school] = richText(params.currentSchool);
  if (params.city) properties[MINOR_FORM_PROPS.city] = richText(params.city);
  if (params.country) properties[MINOR_FORM_PROPS.country] = richText(params.country);
  if (params.formLanguage && FORM_LANGUAGE_LABELS[params.formLanguage]) {
    properties[MINOR_FORM_PROPS.form_language] = { select: { name: FORM_LANGUAGE_LABELS[params.formLanguage] } };
  }

  if (params.languageProficiency.length > 0) {
    const names = params.languageProficiency
      .map((v) => PROFICIENCY_OPTIONS.find((o) => o.value === v)?.notionName)
      .filter((n): n is string => !!n);
    properties[MINOR_FORM_PROPS.proficiency] = { multi_select: names.map((name) => ({ name })) };
  }

  if (params.interests.length > 0) {
    const names = params.interests
      .map((v) => INTEREST_OPTIONS.find((o) => o.value === v)?.notionName)
      .filter((n): n is string => !!n);
    properties[MINOR_FORM_PROPS.interests] = { multi_select: names.map((name) => ({ name })) };
  }

  if (params.relationship) {
    const name = RELATIONSHIP_OPTIONS.find((o) => o.value === params.relationship)?.notionName;
    if (name) properties[MINOR_FORM_PROPS.relationship] = { multi_select: [{ name }] };
  }

  for (const day of WEEKDAYS) {
    const slots = params.availability[day];
    if (slots && slots.length > 0) {
      properties[MINOR_FORM_PROPS[day]] = { multi_select: slots.map((name) => ({ name })) };
    }
  }

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: import.meta.env.NOTION_MINOR_FORM_DATABASE_ID },
      properties,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion minor-registration sync failed: ${res.status} ${text}`);
  }
}
