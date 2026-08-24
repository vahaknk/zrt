// Content for the trilingual registration questionnaire (minor & adult cohorts)
// (`/questionnaire`). Text is transcribed directly from the existing
// Notion Form's field/option names (database e24ad72f-b9ef-83c5-8e4e-0133bbe184c1),
// split into separate hyw/fr/en strings instead of Notion's cramped
// "Armenian\nFrench\nEnglish" single labels. `notionName` values are kept
// exactly as they appear in the Notion schema so submissions can be synced
// back into the same select/multi_select options without creating duplicates.

export const LANGS = ['hyw', 'fr', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type ParticipantType = 'minor' | 'adult';

// Exact time-slot strings as they appear as Notion multi_select option names
// for each day (Wed and Sat have different ranges than Mon/Tue/Thu/Fri).
export const DAY_SLOTS: Record<Weekday, string[]> = {
  monday: ['16:00 - 17:00', '17:00 - 18:00', '18:00 - 19:00', '19:00 - 20:00', '20:00 - 21:00', '21:00 - 22:00'],
  tuesday: ['16:00 - 17:00', '17:00 - 18:00', '18:00 - 19:00', '19:00 - 20:00', '20:00 - 21:00', '21:00 - 22:00'],
  wednesday: [
    '11:00 - 12:00', '12:00 - 13:00', '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00',
    '16:00 - 17:00', '17:00 - 18:00', '18:00 - 19:00', '19:00 - 20:00', '20:00 - 21:00', '21:00 - 22:00',
  ],
  thursday: ['16:00 - 17:00', '17:00 - 18:00', '18:00 - 19:00', '19:00 - 20:00', '20:00 - 21:00', '21:00 - 22:00'],
  friday: ['16:00 - 17:00', '17:00 - 18:00', '18:00 - 19:00', '19:00 - 20:00', '20:00 - 21:00', '21:00 - 22:00'],
  saturday: ['11:00 - 12:00', '12:00 - 13:00', '15:00 - 16:00', '17:00 - 18:00', '18:00 - 19:00', '19:00 - 20:00'],
};

// Union of all slot start times across days, for building the grid's rows.
export const GRID_TIMES = [
  '11:00 - 12:00', '12:00 - 13:00', '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00',
  '16:00 - 17:00', '17:00 - 18:00', '18:00 - 19:00', '19:00 - 20:00', '20:00 - 21:00', '21:00 - 22:00',
];

export const WEEKDAY_LABELS: Record<Weekday, Record<Lang, string>> = {
  monday: { hyw: 'Երկուշաբթի', fr: 'Lundi', en: 'Monday' },
  tuesday: { hyw: 'Երեքշաբթի', fr: 'Mardi', en: 'Tuesday' },
  wednesday: { hyw: 'Չորեքշաբթի', fr: 'Mercredi', en: 'Wednesday' },
  thursday: { hyw: 'Հինգշաբթի', fr: 'Jeudi', en: 'Thursday' },
  friday: { hyw: 'Ուրբաթ', fr: 'Vendredi', en: 'Friday' },
  saturday: { hyw: 'Շաբաթ', fr: 'Samedi', en: 'Saturday' },
};

// Short forms for the narrow availability-grid header columns.
export const WEEKDAY_SHORT_LABELS: Record<Weekday, Record<Lang, string>> = {
  monday: { hyw: 'Երկ.', fr: 'Lun.', en: 'Mon.' },
  tuesday: { hyw: 'Երք.', fr: 'Mar.', en: 'Tue.' },
  wednesday: { hyw: 'Չրք.', fr: 'Mer.', en: 'Wed.' },
  thursday: { hyw: 'Հնգ.', fr: 'Jeu.', en: 'Thu.' },
  friday: { hyw: 'Ուրբ.', fr: 'Ven.', en: 'Fri.' },
  saturday: { hyw: 'Շաբ.', fr: 'Sam.', en: 'Sat.' },
};

export interface FormOption {
  value: string;
  notionName: string;
  label: Record<Lang, string>;
}

export const PROFICIENCY_OPTIONS: FormOption[] = [
  { value: 'none', notionName: 'Բնաւ չի գիտեր։ Ne connaît pas du tout. Does not know at all.',
    label: { hyw: 'Բնաւ չի գիտեր', fr: 'Ne connaît pas du tout.', en: 'Does not know at all.' } },
  { value: 'understands_little', notionName: 'Քիչ մը կը հասկնայ։ Comprend un peu. Understands a little.',
    label: { hyw: 'Քիչ մը կը հասկնայ', fr: 'Comprend un peu.', en: 'Understands a little.' } },
  { value: 'speaks_little', notionName: 'Քիչ մը կը խօսի։ Parle un peu. Speaks a little.',
    label: { hyw: 'Քիչ մը կը խօսի', fr: 'Parle un peu.', en: 'Speaks a little.' } },
  { value: 'reads_writes_little', notionName: 'Քիչ մը կը գրէ ու կը կարդայ։ Lit et écrit un peu. Reads and writes a little.',
    label: { hyw: 'Քիչ մը կը գրէ ու կը կարդայ', fr: 'Lit et écrit un peu.', en: 'Reads and writes a little.' } },
  { value: 'understands', notionName: 'Կը հասկնայ։ Comprend. Understands.',
    label: { hyw: 'Կը հասկնայ', fr: 'Comprend.', en: 'Understands.' } },
  { value: 'speaks', notionName: 'Կը խօսի։ Parle. Speaks.',
    label: { hyw: 'Կը խօսի', fr: 'Parle.', en: 'Speaks.' } },
  { value: 'reads_writes', notionName: 'Կը գրէ ու կը կարդայ։ Lit et écrit. Reads and writes.',
    label: { hyw: 'Կը գրէ ու կը կարդայ', fr: 'Lit et écrit.', en: 'Reads and writes.' } },
  { value: 'understands_easily', notionName: 'Շատ հանգիստ կը հասկնայ։ Comprend très facilement. Understands very easily.',
    label: { hyw: 'Շատ հանգիստ կը հասկնայ', fr: 'Comprend très facilement.', en: 'Understands very easily.' } },
  { value: 'speaks_fluently', notionName: 'Շատ հանգիստ կը խօսի։ Parle très couramment. Speaks very fluently.',
    label: { hyw: 'Շատ հանգիստ կը խօսի', fr: 'Parle très couramment.', en: 'Speaks very fluently.' } },
  { value: 'reads_writes_easily', notionName: 'Շատ հանգիստ կը գրէ ու կը կարդայ։ Lit et écrit très facilement. Reads and writes very easily.',
    label: { hyw: 'Շատ հանգիստ կը գրէ ու կը կարդայ', fr: 'Lit et écrit très facilement.', en: 'Reads and writes very easily.' } },
  { value: 'other', notionName: 'Այլ։ Autre. Other.',
    label: { hyw: 'Այլ', fr: 'Autre.', en: 'Other.' } },
];

export const INTEREST_OPTIONS: FormOption[] = [
  { value: 'language', notionName: 'Լեզու եւ արտայայտութիւն / Langue et expression / Language and expression',
    label: { hyw: 'Լեզու եւ արտայայտութիւն', fr: 'Langue et expression', en: 'Language and expression' } },
  { value: 'reading_writing', notionName: 'Ընթերցում եւ գրութիւն / Lecture et écriture / Reading and writing',
    label: { hyw: 'Ընթերցում եւ գրութիւն', fr: 'Lecture et écriture', en: 'Reading and writing' } },
  { value: 'theater', notionName: 'Թատրոն կամ բեմական արտայայտութիւն / Théâtre ou expression scénique / Theater or performing arts',
    label: { hyw: 'Թատրոն կամ բեմական արտայայտութիւն', fr: 'Théâtre ou expression scénique', en: 'Theater or performing arts' } },
  { value: 'visual_arts', notionName: 'Տեսողական արուեստներ / Arts visuels / Visual arts',
    label: { hyw: 'Տեսողական արուեստներ', fr: 'Arts visuels', en: 'Visual arts' } },
  { value: 'music', notionName: 'Երգ եւ երաժշտութիւն / Chant et musique / Singing and music',
    label: { hyw: 'Երգ եւ երաժշտութիւն', fr: 'Chant et musique', en: 'Singing and music' } },
  { value: 'science', notionName: 'Գիտութիւն / Science / Science',
    label: { hyw: 'Գիտութիւն', fr: 'Science', en: 'Science' } },
  { value: 'sport', notionName: 'Մարզանք / Sport / Sport',
    label: { hyw: 'Մարզանք', fr: 'Sport', en: 'Sport' } },
  { value: 'cooking', notionName: 'Խոհարարութիւն / Cuisine / Cooking',
    label: { hyw: 'Խոհարարութիւն', fr: 'Cuisine', en: 'Cooking' } },
  { value: 'other', notionName: 'Այլ։ Autre. Other.',
    label: { hyw: 'Այլ', fr: 'Autre.', en: 'Other.' } },
];

export const RELATIONSHIP_OPTIONS: FormOption[] = [
  { value: 'mother', notionName: 'Մայրն եմ։ Je suis la mère. I am the mother.',
    label: { hyw: 'Մայրն եմ', fr: 'Je suis la mère.', en: 'I am the mother.' } },
  { value: 'father', notionName: 'Հայրն եմ։ Je suis le père. I am the father.',
    label: { hyw: 'Հայրն եմ', fr: 'Je suis le père.', en: 'I am the father.' } },
  { value: 'grandmother', notionName: 'Մեծ մայրն եմ։ Je suis la grand-mère. I am the grandmother.',
    label: { hyw: 'Մեծ մայրն եմ', fr: 'Je suis la grand-mère.', en: 'I am the grandmother.' } },
  { value: 'grandfather', notionName: 'Մեծ հայրն եմ։ Je suis le grand-père. I am the grandfather.',
    label: { hyw: 'Մեծ հայրն եմ', fr: 'Je suis le grand-père.', en: 'I am the grandfather.' } },
  { value: 'guardian', notionName: 'Պաշտօնական պատասխանատու եմ։ Je suis le responsable légal. I am the legal guardian.',
    label: { hyw: 'Պաշտօնական պատասխանատու եմ', fr: 'Je suis le responsable légal.', en: 'I am the legal guardian.' } },
  { value: 'other', notionName: 'Այլ։ Autre. Other.',
    label: { hyw: 'Այլ', fr: 'Autre.', en: 'Other.' } },
];

export const FIELD_LABELS: Record<Lang, Record<string, string>> = {
  hyw: {
    page_title: 'Մասնակիցի հարցարան',
    participant_type_label: 'Մասնակիցն է՝',
    type_minor: 'Անչափահաս',
    type_adult: 'Չափահաս',
    email: 'Ձեր իմակը',
    respondent_name: 'Ձեր անունը եւ մականունը',
    participant_name: 'Մասնակիցին անունը եւ մականունը',
    participant_birthday: 'Մասնակիցին ծննդեան թուականը',
    current_school: 'Յաճախած դպրոցը եւ դասարանը',
    profession: 'Ձեր ասպարէզը',
    city: 'Քաղաք',
    country: 'Երկիր',
    proficiency: 'Մասնակիցին լեզուական պատրաստութիւնը',
    interests: 'Մասնակիցին հետաքրքրութիւնները',
    relationship: 'Ձեր կապը մասնակիցին հետ',
    fee_ack: 'Տեղեակ եմ, որ Զարցանցը վճարովի ծրագիր մըն է եւ տարեկան վճարումը 1500 եւրօ է։',
    availability_title: 'Մասնակիցին յարմար օրերն ու ժամերը',
    availability_hint: 'Ժամերը ցուցադրուած են Փարիզի ժամով։ Ընտրեցէք ձեր ժամային գօտին՝ համապատասխան ժամերը տեսնելու համար։',
    timezone_label: 'Ձեր ժամային գօտին',
    availability_other: 'Այլ նշում ձեր օրերու/ժամերու մասին (եթէ կայ)',
    other_specify: 'Խնդրենք նշեցէք',
    submit: 'Ուղարկել',
    success: 'Շնորհակալութիւն։ Ձեր դիմումը ուղարկուեցաւ։',
    error: 'Սխալ մը պատահեցաւ։ Խնդրենք կրկին փորձեցէք։',
    no_match_error: 'Ձեր տուեալներով գրանցում մը չգտանք։ Խնդրենք ստուգել ձեր իմակը, կամ նախ գրանցուիլ։',
    select_placeholder: '—',
  },
  fr: {
    page_title: 'Questionnaire du participant',
    participant_type_label: 'Le/la participant.e est :',
    type_minor: 'Mineur.e',
    type_adult: 'Adulte',
    email: 'Votre e-mail',
    respondent_name: 'Votre prénom et votre nom',
    participant_name: 'Prénom et nom du/de la participant.e',
    participant_birthday: 'Date de naissance du/de la participant.e',
    current_school: 'École actuelle et niveau',
    profession: 'Votre profession',
    city: 'Ville',
    country: 'Pays',
    proficiency: 'Maîtrise de la langue par le/la participant.e',
    interests: "Centres d'intérêt du/de la participant.e",
    relationship: 'Votre lien avec le/la participant.e',
    fee_ack: "J'ai bien compris que Zartsants est un programme payant, au tarif annuel de 1500€.",
    availability_title: 'Jours et heures qui conviennent au/à la participant.e',
    availability_hint: 'Les heures sont affichées à l’heure de Paris. Choisissez votre fuseau horaire pour voir les heures correspondantes.',
    timezone_label: 'Votre fuseau horaire',
    availability_other: 'Autre remarque sur vos disponibilités (facultatif)',
    other_specify: 'Veuillez préciser',
    submit: 'Envoyer',
    success: 'Merci. Votre inscription a bien été envoyée.',
    error: "Une erreur s'est produite. Veuillez réessayer.",
    no_match_error: "Nous n'avons pas trouvé d'inscription correspondante. Vérifiez votre e-mail, ou inscrivez-vous d'abord.",
    select_placeholder: '—',
  },
  en: {
    page_title: 'Participant Questionnaire',
    participant_type_label: 'The participant is a:',
    type_minor: 'Minor',
    type_adult: 'Adult',
    email: 'Your email',
    respondent_name: 'Your name and surname',
    participant_name: "The participant's name and surname",
    participant_birthday: "The participant's birthday",
    current_school: 'Current school and grade/class',
    profession: 'Your profession',
    city: 'City',
    country: 'Country',
    proficiency: "Participant's language proficiency",
    interests: "Participant's interests",
    relationship: 'Your relationship to the participant',
    fee_ack: 'I am aware that Zartsants is a paid program and the annual fee is €1,500.',
    availability_title: 'Days and times that work for the participant',
    availability_hint: 'Times are shown in Paris time. Choose your timezone to see the equivalent hours.',
    timezone_label: 'Your timezone',
    availability_other: 'Anything else about your availability? (optional)',
    other_specify: 'Please specify',
    submit: 'Submit',
    success: 'Thank you. Your registration has been submitted.',
    error: 'Something went wrong. Please try again.',
    no_match_error: "We couldn't find a matching registration. Please double-check your email, or register first.",
    select_placeholder: '—',
  },
};
