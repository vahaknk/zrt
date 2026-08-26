import type { APIRoute } from 'astro';
import { adminGet, adminPatch, adminPost } from '../../lib/directusAdmin';
import { syncMinorRegistrationToNotion } from '../../lib/notion';

function normalizeName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents (café -> cafe)
    .replace(/\s+/g, ' ');
}

// Loose match: exact, one contains the other (missing middle name / different
// name order), or they share a whole word (e.g. the first name) in common —
// tolerates typos and formatting differences without matching unrelated names.
function namesLikelyMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const wordsB = nb.split(' ');
  return na.split(' ').some((w) => w.length > 1 && wordsB.includes(w));
}

// The birthday field is entered as free text in DD/MM/YYYY — convert to the
// ISO format Directus's native `date` fields expect. Returns null (silently
// dropped) if it doesn't parse, rather than sending Directus a bad value.
function parseDDMMYYYY(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  const email = String(body.email ?? '').trim();
  const respondentName = String(body.respondent_name ?? '').trim();
  const participantType = body.participant_type === 'adult' ? 'adult' : 'minor';
  // Adults don't get a separate "participant name" question — they are the participant.
  const participantName = String(body.participant_name ?? '').trim() || respondentName;
  const feeAcknowledged = body.fee_acknowledged === true;

  if (!email || !respondentName || !participantName || !feeAcknowledged) {
    return new Response(JSON.stringify({ error: 'missing_required_fields' }), { status: 400 });
  }

  const availability = body.availability ?? {};
  const participantBirthdayRaw = String(body.participant_birthday ?? '').trim();
  const participantBirthdayISO = participantBirthdayRaw ? parseDDMMYYYY(participantBirthdayRaw) : null;

  const answers = {
    respondent_name: respondentName,
    participant_type: participantType,
    current_school: body.current_school || null,
    profession: body.profession || null,
    language_proficiency: Array.isArray(body.language_proficiency) ? body.language_proficiency : [],
    language_proficiency_other: body.language_proficiency_other || null,
    interests: Array.isArray(body.interests) ? body.interests : [],
    interests_other: body.interests_other || null,
    relationship: body.relationship || null,
    relationship_other: body.relationship_other || null,
    availability,
    availability_other: body.availability_other || null,
    fee_acknowledged: feeAcknowledged,
    questionnaire_language: body.form_language || null,
    // Availability slots are in this timezone, not Paris time — needed to make
    // sense of them later (a future admin tool converts/reports across zones).
    timezone: body.timezone || null,
  };

  // Match against an existing registration_requests row by email, disambiguating by
  // participant name only when needed — one parent can register multiple children
  // under the same email, but if the email only has one row, a name typo/spelling
  // difference shouldn't block the match.
  let match: any = null;
  try {
    const res = await adminGet(
      `/items/registration_requests?filter[email][_icontains]=${encodeURIComponent(email)}&fields=id,email,full_name,city,country,birthday&limit=50`
    );
    const byEmail = (res.data ?? []).filter(
      (r: any) => String(r.email).trim().toLowerCase() === email.toLowerCase()
    );
    if (byEmail.length === 1) {
      match = byEmail[0];
    } else if (byEmail.length > 1) {
      const byName = byEmail.filter((r: any) => namesLikelyMatch(String(r.full_name ?? ''), participantName));
      if (byName.length === 1) match = byName[0];
    }
  } catch (e) {
    console.log('Lookup failed for questionnaire match:', (e as Error)?.message);
  }

  if (match) {
    const patchBody: Record<string, unknown> = { ...answers };
    // Fill gaps in existing curated fields, but never clobber data that's already there.
    if (!match.city && body.city) patchBody.city = body.city;
    if (!match.country && body.country) patchBody.country = body.country;
    if (!match.birthday && participantBirthdayISO) patchBody.birthday = participantBirthdayISO;

    try {
      await adminPatch(`/items/registration_requests/${match.id}`, patchBody);
    } catch (e) {
      console.log('Failed to patch matched registration:', (e as Error)?.message);
      return new Response(JSON.stringify({ error: 'Failed to save registration' }), { status: 500 });
    }

    try {
      await syncMinorRegistrationToNotion({
        respondentName,
        participantName,
        participantType,
        participantBirthday: participantBirthdayRaw || null,
        currentSchool: answers.current_school,
        city: body.city || null,
        country: body.country || null,
        languageProficiency: answers.language_proficiency,
        interests: answers.interests,
        relationship: answers.relationship,
        feeAcknowledged,
        availability,
        formLanguage: answers.questionnaire_language,
        timezone: answers.timezone,
      });
    } catch (e) {
      console.log('Notion sync failed for questionnaire (non-blocking):', (e as Error)?.message);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  // No matching registration found — capture the submission as a lead rather than
  // losing it, but tell the user so they can double-check their email/name.
  try {
    await adminPost('/items/unmatched_questionnaire_leads', {
      email,
      respondent_name: respondentName,
      participant_type: participantType,
      participant_name: participantName,
      participant_birthday: participantBirthdayISO,
      current_school: answers.current_school,
      profession: answers.profession,
      city: body.city || null,
      country: body.country || null,
      language_proficiency: answers.language_proficiency,
      language_proficiency_other: answers.language_proficiency_other,
      interests: answers.interests,
      interests_other: answers.interests_other,
      relationship: answers.relationship,
      relationship_other: answers.relationship_other,
      availability,
      availability_other: answers.availability_other,
      fee_acknowledged: feeAcknowledged,
      form_language: answers.questionnaire_language,
      timezone: answers.timezone,
    });
  } catch (e) {
    console.log('Failed to save unmatched questionnaire lead:', (e as Error)?.message);
  }

  return new Response(JSON.stringify({ error: 'no_match' }), { status: 404 });
};
