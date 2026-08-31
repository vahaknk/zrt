import type { APIRoute } from 'astro';
import { adminPost } from '../../lib/directusAdmin';
import { syncMinorRegistrationToNotion } from '../../lib/notion';

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
    email,
    respondent_name: respondentName,
    participant_type: participantType,
    participant_name: participantName,
    participant_birthday: participantBirthdayISO,
    current_school: body.current_school || null,
    profession: body.profession || null,
    city: body.city || null,
    country: body.country || null,
    language_proficiency: Array.isArray(body.language_proficiency) ? body.language_proficiency : [],
    language_proficiency_other: body.language_proficiency_other || null,
    interests: Array.isArray(body.interests) ? body.interests : [],
    interests_other: body.interests_other || null,
    relationship: body.relationship || null,
    relationship_other: body.relationship_other || null,
    availability,
    availability_other: body.availability_other || null,
    fee_acknowledged: feeAcknowledged,
    form_language: body.form_language || null,
    // Availability slots are in this timezone, not Paris time — needed to make
    // sense of them later (a future admin tool converts/reports across zones).
    timezone: body.timezone || null,
  };

  // Every submission is its own permanent record — no attempt to match it
  // against an existing registration by email/name. That matching used to
  // merge a submission into whatever single row shared the email, which
  // silently overwrote a different child's answers when one parent filled
  // this out for several kids. The Directus row's own `id` is the reference
  // staff use (visible on the admin questionnaire page) to manually link a
  // submission to the right person.
  let created: any = null;
  try {
    created = await adminPost('/items/unmatched_questionnaire_leads', answers);
  } catch (e) {
    console.log('Failed to save questionnaire submission:', (e as Error)?.message);
    return new Response(JSON.stringify({ error: 'Failed to save registration' }), { status: 500 });
  }

  try {
    await syncMinorRegistrationToNotion({
      respondentName,
      participantName,
      participantType,
      participantBirthday: participantBirthdayRaw || null,
      currentSchool: answers.current_school,
      city: answers.city,
      country: answers.country,
      languageProficiency: answers.language_proficiency,
      interests: answers.interests,
      relationship: answers.relationship,
      feeAcknowledged,
      availability,
      formLanguage: answers.form_language,
      timezone: answers.timezone,
    });
  } catch (e) {
    console.log('Notion sync failed for questionnaire (non-blocking):', (e as Error)?.message);
  }

  return new Response(JSON.stringify({ success: true, id: created?.data?.id ?? null }), { status: 200 });
};
