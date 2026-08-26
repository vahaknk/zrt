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

// Curated timezone groups for the questionnaire's timezone selector, covering
// the diaspora communities this form is actually used by. Each entry's `tz`
// is a representative IANA zone for the whole group (the countries listed
// share the same offset/DST rules), and `label` is the exact trilingual
// group text as given, not machine-translated.
export interface TimezoneGroup {
  tz: string;
  label: Record<Lang, string>;
}

export const TIMEZONE_GROUPS: TimezoneGroup[] = [
  { tz: 'Europe/London', label: {
    hyw: 'Միացեալ Թագաւորութիւն, Փորթուկալ',
    fr: 'Royaume-Uni, Portugal',
    en: 'United Kingdom, Portugal',
  } },
  { tz: 'Europe/Paris', label: {
    hyw: 'Ֆրանսա, Գերմանիա, Պելճիքա, Զուիցերիա, Շուէտ, Սպանիա, Նորվեկիա, Լեհաստան, Հոլանտա',
    fr: 'France, Allemagne, Belgique, Suisse, Suède, Espagne, Norvège, Pologne, Pays-Bas',
    en: 'France, Germany, Belgium, Switzerland, Sweden, Spain, Norway, Poland, Netherlands',
  } },
  { tz: 'Europe/Athens', label: {
    hyw: 'Յունաստան, Պուլկարիա, Լիբանան, Սուրիա, Ռումանիա, Եգիպտոս',
    fr: 'Grèce, Bulgarie, Liban, Syrie, Roumanie, Égypte',
    en: 'Greece, Bulgaria, Lebanon, Syria, Romania, Egypt',
  } },
  { tz: 'Europe/Istanbul', label: {
    hyw: 'Թուրքիա, Իրաք, Յորդանան',
    fr: 'Turquie, Irak, Jordanie',
    en: 'Turkey, Iraq, Jordan',
  } },
  { tz: 'Asia/Tehran', label: {
    hyw: 'Պարսկաստան',
    fr: 'Iran',
    en: 'Iran',
  } },
  { tz: 'Asia/Yerevan', label: {
    hyw: 'Հայաստան, Վրաստան, Արաբական Միացեալ Էմիրութիւններ',
    fr: 'Arménie, Géorgie, Émirats arabes unis',
    en: 'Armenia, Georgia, United Arab Emirates',
  } },
  { tz: 'Asia/Jerusalem', label: {
    hyw: 'Իսրայէլ',
    fr: 'Israël',
    en: 'Israel',
  } },
  { tz: 'Australia/Sydney', label: {
    hyw: 'Աւստրալիա – Արեւելք (Սիտնի, Մելպուրն)',
    fr: 'Australie – Est (Sydney, Melbourne)',
    en: 'Australia – East (Sydney, Melbourne)',
  } },
  { tz: 'America/Argentina/Buenos_Aires', label: {
    hyw: 'Արժանթին, Ուրուկուայ',
    fr: 'Argentine, Uruguay',
    en: 'Argentina, Uruguay',
  } },
  { tz: 'America/New_York', label: {
    hyw: 'ԱՄՆ – Արեւելեան ափ (Նիւ Եորք, Մասաչուսէթս, Ուաշինկթըն Տի Սի, Նիւ Ճըրզի, Փենսիլվանիա, Ֆլորիտա, Պոսթոն, Ուոթըրթաուն, Միշիկըն, Տիթրոյթ)',
    fr: 'États-Unis – Côte Est (New York, Massachusetts, Washington D.C., New Jersey, Pennsylvanie, Floride, Boston, Watertown, Michigan, Détroit)',
    en: 'USA – East Coast (New York, Massachusetts, Washington D.C., New Jersey, Pennsylvania, Florida, Boston, Watertown, Michigan, Detroit)',
  } },
  { tz: 'America/Toronto', label: {
    hyw: 'Քանատա – Արեւելք (Քեպէք, Օնթարիօ, Մոնթրէալ, Թորոնթօ)',
    fr: 'Canada – Est (Québec, Ontario, Montréal, Toronto)',
    en: 'Canada – East (Quebec, Ontario, Montreal, Toronto)',
  } },
  { tz: 'America/Chicago', label: {
    hyw: 'ԱՄՆ – Կեդրոնական մաս (Իլինոյ, Թեքսաս, Շիքակօ)',
    fr: 'États-Unis d’Amérique – Centre (Illinois, Texas, Chicago)',
    en: 'USA – Central (Illinois, Texas, Chicago)',
  } },
  { tz: 'America/Denver', label: {
    hyw: 'ԱՄՆ – Լեռնային մաս (Արիզոնա, Քոլորատօ, Լաս Վեկաս)',
    fr: 'États-Unis d’Amérique – Montagnes (Arizona, Colorado, Las Vegas)',
    en: 'USA – Mountain (Arizona, Colorado, Las Vegas)',
  } },
  { tz: 'America/Los_Angeles', label: {
    hyw: 'ԱՄՆ – Արեւմտեան ափ (Քալիֆորնիա, Սան Ֆրանսիսքօ, Նեւատա)',
    fr: 'États-Unis d’Amérique – Côte Ouest (Californie, San Francisco, Nevada)',
    en: 'USA – West Coast (California, San Francisco, Nevada)',
  } },
  { tz: 'America/Vancouver', label: {
    hyw: 'Քանատա – Արեւմուտք (Պրիթիշ Քոլումպիա, Վանգուվըր)',
    fr: 'Canada – Ouest (Colombie-Britannique, Vancouver)',
    en: 'Canada – West (British Columbia, Vancouver)',
  } },
  { tz: 'America/Campo_Grande', label: {
    hyw: 'Պրազիլ - Տուրատոս',
    fr: 'Brésil - Dourados',
    en: 'Brazil - Dourados',
  } },
  { tz: 'America/Sao_Paulo', label: {
    hyw: 'Պրազիլ - Ռիօ տը Ժաներօ',
    fr: 'Brésil - Rio de Janeiro',
    en: 'Brazil - Rio de Janeiro',
  } },
  { tz: 'America/Caracas', label: {
    hyw: 'Վենեզուելա',
    fr: 'Venezuela',
    en: 'Venezuela',
  } },
];

// The grid always shows 10:00-22:00, one-hour slots, the same on every day —
// these are NOT Paris time. They're whatever timezone the respondent has
// picked in the timezone selector (stored alongside the answers), so the
// picker always looks like a plain 10am-10pm day regardless of where the
// respondent is. Converting these to Paris time (or any reporting basis) is
// left to a future admin-side tool that reads the stored timezone + slots.
function hourSlots(startHour: number, endHour: number): string[] {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00 - ${String(h + 1).padStart(2, '0')}:00`);
  }
  return slots;
}

export const GRID_TIMES = hourSlots(10, 22);

export const DAY_SLOTS: Record<Weekday, string[]> = {
  monday: GRID_TIMES,
  tuesday: GRID_TIMES,
  wednesday: GRID_TIMES,
  thursday: GRID_TIMES,
  friday: GRID_TIMES,
  saturday: GRID_TIMES,
};

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

// For the custom birthday calendar picker (needs all 7 days, Monday-first).
export const CALENDAR_WEEKDAYS: Record<Lang, string[]> = {
  hyw: ['Երկ', 'Երք', 'Չրք', 'Հնգ', 'Ուրբ', 'Շաբ', 'Կիր'],
  fr: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};

export const MONTH_LABELS: Record<Lang, string[]> = {
  hyw: ['Յունուար', 'Փետրուար', 'Մարտ', 'Ապրիլ', 'Մայիս', 'Յունիս', 'Յուլիս', 'Օգոստոս', 'Սեպտեմբեր', 'Հոկտեմբեր', 'Նոյեմբեր', 'Դեկտեմբեր'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
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
    page_title: 'Ձեր մասնակցութեան մասին',
    participant_type_label: 'Մասնակիցը՝',
    type_minor: 'Անչափահաս է',
    type_adult: 'Չափահաս է',
    email: 'Ձեր իմակը',
    respondent_name: 'Ձեր անունը եւ մականունը',
    participant_name: 'Մասնակիցին անունը եւ մականունը',
    participant_birthday: 'Մասնակիցին ծննդեան թուականը',
    birthday_format: 'ՕՕ/ԱԱ/ՏՏՏՏ',
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
    page_title: 'Au sujet de votre participation',
    participant_type_label: 'Le/la participant.e est :',
    type_minor: 'Mineur.e',
    type_adult: 'Adulte',
    email: 'Votre e-mail',
    respondent_name: 'Votre prénom et votre nom',
    participant_name: 'Prénom et nom du/de la participant.e',
    participant_birthday: 'Date de naissance du/de la participant.e',
    birthday_format: 'JJ/MM/AAAA',
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
    page_title: 'About your participation',
    participant_type_label: 'The participant is a:',
    type_minor: 'Minor',
    type_adult: 'Adult',
    email: 'Your email',
    respondent_name: 'Your name and surname',
    participant_name: "The participant's name and surname",
    participant_birthday: "The participant's birthday",
    birthday_format: 'DD/MM/YYYY',
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
