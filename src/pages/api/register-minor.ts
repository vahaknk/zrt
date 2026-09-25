import type { APIRoute } from 'astro';
import { adminGet, adminPost } from '../../lib/directusAdmin';
import { isValidBookingToken } from '../../lib/booking';
import { syncMinorRegistrationToNotion } from '../../lib/notion';

// The birthday field is entered as free text in DD/MM/YYYY — convert to the
// ISO format Directus's native `date` fields expect. Returns null (silently
// dropped) if it doesn't parse, rather than sending Directus a bad value.
function parseDDMMYYYY(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, ddStr, mmStr, yyyy] = m;
  const dd = Number(ddStr);
  const mm = Number(mmStr);
  const year = Number(yyyy);
  // The shape regex above accepts e.g. "12/25/1990" (a US-style MM/DD slip),
  // which isn't a valid DD/MM date — reject anything outside a real calendar
  // date instead of forwarding it to Directus, where it fails as an opaque
  // 500 at save time.
  if (mm < 1 || mm > 12) return null;
  const daysInMonth = new Date(year, mm, 0).getDate();
  if (dd < 1 || dd > daysInMonth) return null;
  return `${yyyy}-${mmStr.padStart(2, '0')}-${ddStr.padStart(2, '0')}`;
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  const email = String(body.email ?? '').trim();
  const respondentName = String(body.respondent_name ?? '').trim();
  const participantType = body.participant_type === 'adult' ? 'adult' : 'minor';
  // Adults don't get a separate "participant name" question — they are the participant.
  const participantName = String(body.participant_name ?? '').trim() || respondentName;
  const feeAcknowledged = body.fee_acknowledged === true;
  const participantBirthdayRaw = String(body.participant_birthday ?? '').trim();
  const currentSchool = String(body.current_school ?? '').trim();
  const profession = String(body.profession ?? '').trim();
  const city = String(body.city ?? '').trim();
  const country = String(body.country ?? '').trim();
  const languageProficiency = Array.isArray(body.language_proficiency) ? body.language_proficiency : [];
  const interests = Array.isArray(body.interests) ? body.interests : [];
  const relationship = String(body.relationship ?? '').trim();
  const schoolOrProfession = participantType === 'adult' ? profession : currentSchool;

  if (
    !email ||
    !respondentName ||
    !participantName ||
    !feeAcknowledged ||
    !participantBirthdayRaw ||
    !schoolOrProfession ||
    !city ||
    !country ||
    languageProficiency.length === 0 ||
    interests.length === 0 ||
    (participantType === 'minor' && !relationship)
  ) {
    return new Response(JSON.stringify({ error: 'missing_required_fields' }), { status: 400 });
  }

  const availability = body.availability ?? {};
  const participantBirthdayISO = parseDDMMYYYY(participantBirthdayRaw);

  if (!participantBirthdayISO) {
    return new Response(JSON.stringify({ error: 'invalid_birthday' }), { status: 400 });
  }

  const answers = {
    email,
    respondent_name: respondentName,
    participant_type: participantType,
    participant_name: participantName,
    participant_birthday: participantBirthdayISO,
    current_school: currentSchool || null,
    profession: profession || null,
    city,
    country,
    language_proficiency: languageProficiency,
    language_proficiency_other: body.language_proficiency_other || null,
    interests,
    interests_other: body.interests_other || null,
    relationship: relationship || null,
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
  //
  // The exception is a submission from the interview-confirmation email's
  // link: its booking token identifies exactly one registration (one per
  // child), so that link is recorded — alongside, never merged into it.
  let registrationRequest: number | null = null;
  if (isValidBookingToken(body.registration_token)) {
    try {
      const res = await adminGet(
        `/items/registration_requests?filter[token][_eq]=${encodeURIComponent(body.registration_token)}&filter[slot_chosen][_eq]=true&fields=id&limit=1`
      );
      registrationRequest = res.data?.[0]?.id ?? null;
    } catch (e) {
      // Linking is a convenience — never lose the submission over it.
      console.log('Questionnaire registration lookup failed:', (e as Error)?.message);
    }
  }

  let created: any = null;
  try {
    created = await adminPost('/items/unmatched_questionnaire_leads', {
      ...answers,
      ...(registrationRequest ? { registration_request: registrationRequest } : {}),
    });
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
      // Notion has one shared property for this — school for minors,
      // profession for adults — matching schoolOrProfession above.
      currentSchool: schoolOrProfession || null,
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
