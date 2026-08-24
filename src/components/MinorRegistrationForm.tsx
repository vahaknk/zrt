import { useState, useEffect, useMemo } from 'react';
import {
  type Lang,
  type Weekday,
  type ParticipantType,
  LANGS,
  WEEKDAYS,
  GRID_TIMES,
  DAY_SLOTS,
  WEEKDAY_SHORT_LABELS,
  PROFICIENCY_OPTIONS,
  INTEREST_OPTIONS,
  RELATIONSHIP_OPTIONS,
  FIELD_LABELS,
} from '../lib/minorFormContent';

interface Props {
  initialLang: Lang;
}

const LANG_NAMES: Record<Lang, string> = { hyw: 'Հայերէն', fr: 'Français', en: 'English' };

const cardBg = '#fff';
const border = '1px solid rgba(0,0,0,0.15)';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.9rem',
  fontWeight: 600,
  marginBottom: '0.4rem',
  color: '#000',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.6rem 0.8rem',
  background: '#fff',
  border,
  borderRadius: 8,
  fontSize: '1rem',
  color: '#000',
  outline: 'none',
  fontFamily: 'inherit',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '1.5rem',
};

const optionRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  padding: '0.35rem 0',
  cursor: 'pointer',
  color: '#000',
  fontSize: '0.95rem',
};

const FALLBACK_TIMEZONES = [
  'Europe/Paris', 'Europe/London', 'Europe/Istanbul', 'Europe/Athens', 'Asia/Yerevan',
  'Europe/Berlin', 'Europe/Moscow', 'America/New_York', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Asia/Dubai', 'Asia/Beirut', 'Australia/Sydney',
];

function getTimezones(): string[] {
  try {
    // @ts-ignore — not in all TS lib targets yet, but widely supported at runtime
    const list = Intl.supportedValuesOf?.('timeZone');
    if (Array.isArray(list) && list.length > 0) return list;
  } catch {}
  return FALLBACK_TIMEZONES;
}

// Grid times are Paris wall-clock times (e.g. "16:00"). To show them in another
// timezone we treat the time as if it were on `referenceDate`, figure out Paris's
// UTC offset for that date (handles DST), then reformat the resulting instant in
// the target zone. Reference date only affects which DST offset applies, so using
// "today" is accurate except right at a DST transition boundary.
function parisOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'shortOffset' }).formatToParts(instant);
  const tzName = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+1';
  const match = tzName.match(/GMT([+-]\d+)/);
  return match ? parseInt(match[1], 10) * 60 : 60;
}

function convertParisTime(hhmm: string, targetTz: string, referenceDate: Date): string {
  const [h, m] = hhmm.split(':').map(Number);
  const naiveUTC = Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), h, m);
  const offset = parisOffsetMinutes(new Date(naiveUTC));
  const actualUTC = new Date(naiveUTC - offset * 60000);
  return actualUTC.toLocaleTimeString('en-GB', { timeZone: targetTz, hour: '2-digit', minute: '2-digit', hour12: false });
}

function convertParisRange(range: string, targetTz: string, referenceDate: Date): string {
  const [start, end] = range.split(' - ');
  return `${convertParisTime(start, targetTz, referenceDate)} - ${convertParisTime(end, targetTz, referenceDate)}`;
}

type ProficiencyValue = string;

interface FormState {
  email: string;
  respondent_name: string;
  participant_name: string;
  participant_birthday: string;
  current_school: string;
  profession: string;
  city: string;
  country: string;
  language_proficiency: ProficiencyValue[];
  language_proficiency_other: string;
  interests: string[];
  interests_other: string;
  relationship: string;
  relationship_other: string;
  availability: Partial<Record<Weekday, string[]>>;
  availability_other: string;
  fee_acknowledged: boolean;
}

const initialState: FormState = {
  email: '',
  respondent_name: '',
  participant_name: '',
  participant_birthday: '',
  current_school: '',
  profession: '',
  city: '',
  country: '',
  language_proficiency: [],
  language_proficiency_other: '',
  interests: [],
  interests_other: '',
  relationship: '',
  relationship_other: '',
  availability: {},
  availability_other: '',
  fee_acknowledged: false,
};

function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export default function MinorRegistrationForm({ initialLang }: Props) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [participantType, setParticipantType] = useState<ParticipantType>('minor');
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error' | 'no_match'>('idle');
  const [timezone, setTimezone] = useState('Europe/Paris');
  const t = FIELD_LABELS[lang];
  const timezones = useMemo(() => getTimezones(), []);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimezone(detected);
    } catch {}
  }, []);

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const toggleDaySlot = (day: Weekday, slot: string) => {
    setForm((f) => {
      const current = f.availability[day] ?? [];
      return { ...f, availability: { ...f.availability, [day]: toggleInArray(current, slot) } };
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/register-minor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          // Adults don't get a separate "participant name" question — they are the participant.
          participant_name: participantType === 'adult' ? form.respondent_name : form.participant_name,
          participant_type: participantType,
          form_language: lang,
        }),
      });
      if (res.ok) {
        setStatus('success');
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus(data?.error === 'no_match' ? 'no_match' : 'error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem', textAlign: 'center' }}>
        <p style={{ color: '#000', fontSize: '1.2rem', fontWeight: 600 }}>✓ {t.success}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {LANGS.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              color: code === lang ? '#000' : 'rgba(0,0,0,0.55)',
              textDecoration: code === lang ? 'underline' : 'none',
            }}
          >
            {LANG_NAMES[code]}
          </button>
        ))}
      </div>

      <h1 style={{ color: '#000', fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' }}>{t.page_title}</h1>

      <div style={sectionStyle}>
        <label style={labelStyle}>{t.participant_type_label}</label>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {(['minor', 'adult'] as ParticipantType[]).map((type) => (
            <label key={type} style={optionRowStyle}>
              <input type="radio" name="participant_type" checked={participantType === type} onChange={() => setParticipantType(type)} />
              {type === 'minor' ? t.type_minor : t.type_adult}
            </label>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>{t.email}</label>
        <input style={inputStyle} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>{t.respondent_name}</label>
        <input style={inputStyle} type="text" value={form.respondent_name} onChange={(e) => set('respondent_name', e.target.value)} required />
      </div>

      {participantType === 'minor' && (
        <div style={sectionStyle}>
          <label style={labelStyle}>{t.participant_name}</label>
          <input style={inputStyle} type="text" value={form.participant_name} onChange={(e) => set('participant_name', e.target.value)} required />
        </div>
      )}

      <div style={sectionStyle}>
        <label style={labelStyle}>{t.participant_birthday}</label>
        <input style={inputStyle} type="date" value={form.participant_birthday} onChange={(e) => set('participant_birthday', e.target.value)} />
      </div>

      {participantType === 'minor' ? (
        <div style={sectionStyle}>
          <label style={labelStyle}>{t.current_school}</label>
          <input style={inputStyle} type="text" value={form.current_school} onChange={(e) => set('current_school', e.target.value)} />
        </div>
      ) : (
        <div style={sectionStyle}>
          <label style={labelStyle}>{t.profession}</label>
          <input style={inputStyle} type="text" value={form.profession} onChange={(e) => set('profession', e.target.value)} />
        </div>
      )}

      <div style={sectionStyle}>
        <label style={labelStyle}>{t.city}</label>
        <input style={inputStyle} type="text" value={form.city} onChange={(e) => set('city', e.target.value)} />
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>{t.country}</label>
        <input style={inputStyle} type="text" value={form.country} onChange={(e) => set('country', e.target.value)} />
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>{t.proficiency}</label>
        {PROFICIENCY_OPTIONS.map((opt) => (
          <label key={opt.value} style={optionRowStyle}>
            <input
              type="checkbox"
              checked={form.language_proficiency.includes(opt.value)}
              onChange={() => set('language_proficiency', toggleInArray(form.language_proficiency, opt.value))}
            />
            {opt.label[lang]}
          </label>
        ))}
        {form.language_proficiency.includes('other') && (
          <input
            style={{ ...inputStyle, marginTop: '0.5rem' }}
            type="text"
            placeholder={t.other_specify}
            value={form.language_proficiency_other}
            onChange={(e) => set('language_proficiency_other', e.target.value)}
          />
        )}
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>{t.interests}</label>
        {INTEREST_OPTIONS.map((opt) => (
          <label key={opt.value} style={optionRowStyle}>
            <input
              type="checkbox"
              checked={form.interests.includes(opt.value)}
              onChange={() => set('interests', toggleInArray(form.interests, opt.value))}
            />
            {opt.label[lang]}
          </label>
        ))}
        {form.interests.includes('other') && (
          <input
            style={{ ...inputStyle, marginTop: '0.5rem' }}
            type="text"
            placeholder={t.other_specify}
            value={form.interests_other}
            onChange={(e) => set('interests_other', e.target.value)}
          />
        )}
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>{t.relationship}</label>
        {RELATIONSHIP_OPTIONS.map((opt) => (
          <label key={opt.value} style={optionRowStyle}>
            <input
              type="radio"
              name="relationship"
              checked={form.relationship === opt.value}
              onChange={() => set('relationship', opt.value)}
            />
            {opt.label[lang]}
          </label>
        ))}
        {form.relationship === 'other' && (
          <input
            style={{ ...inputStyle, marginTop: '0.5rem' }}
            type="text"
            placeholder={t.other_specify}
            value={form.relationship_other}
            onChange={(e) => set('relationship_other', e.target.value)}
          />
        )}
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>{t.availability_title}</label>
        <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{t.availability_hint}</p>

        <div style={{ marginBottom: '0.75rem', maxWidth: 320 }}>
          <label style={labelStyle}>{t.timezone_label}</label>
          <select style={inputStyle} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {timezones.map((tz) => (
              <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div style={{ overflowX: 'auto', background: '#fff', border, borderRadius: 8, padding: '0.75rem' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 560, tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ padding: '0.3rem', color: 'rgba(0,0,0,0.5)', fontSize: '0.75rem', width: '18%' }}></th>
                {WEEKDAYS.map((day) => (
                  <th key={day} style={{ padding: '0.3rem', color: '#000', fontSize: '0.75rem', fontWeight: 600, width: `${82 / WEEKDAYS.length}%`, whiteSpace: 'nowrap' }}>
                    {WEEKDAY_SHORT_LABELS[day][lang]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GRID_TIMES.map((time) => (
                <tr key={time}>
                  <td style={{ padding: '0.2rem 0.5rem', color: 'rgba(0,0,0,0.5)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {timezone === 'Europe/Paris' ? time : convertParisRange(time, timezone, today)}
                  </td>
                  {WEEKDAYS.map((day) => {
                    const valid = DAY_SLOTS[day].includes(time);
                    const selected = (form.availability[day] ?? []).includes(time);
                    return (
                      <td key={day} style={{ padding: 2, textAlign: 'center' }}>
                        {valid ? (
                          <button
                            type="button"
                            onClick={() => toggleDaySlot(day, time)}
                            style={{
                              width: '100%',
                              height: 28,
                              border: '1px solid rgba(0,0,0,0.2)',
                              borderRadius: 6,
                              background: selected ? '#2e9e4f' : '#fff',
                              color: selected ? '#fff' : 'rgba(0,0,0,0.3)',
                              cursor: 'pointer',
                              transition: 'background 0.15s, color 0.15s',
                            }}
                            aria-pressed={selected}
                          />
                        ) : (
                          <div style={{ height: 28 }} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <textarea
          style={{ ...inputStyle, marginTop: '0.75rem', minHeight: 60, resize: 'vertical' }}
          placeholder={t.availability_other}
          value={form.availability_other}
          onChange={(e) => set('availability_other', e.target.value)}
        />
      </div>

      <div style={{ ...sectionStyle, display: 'flex', alignItems: 'flex-start', gap: '0.6rem', background: cardBg, border, borderRadius: 8, padding: '0.9rem' }}>
        <input
          type="checkbox"
          id="fee_ack"
          checked={form.fee_acknowledged}
          onChange={(e) => set('fee_acknowledged', e.target.checked)}
          required
          style={{ marginTop: 3, flexShrink: 0 }}
        />
        <label htmlFor="fee_ack" style={{ color: '#000', fontSize: '0.9rem', cursor: 'pointer' }}>{t.fee_ack}</label>
      </div>

      {status === 'error' && <p style={{ color: '#c0392b', fontSize: '0.9rem' }}>{t.error}</p>}
      {status === 'no_match' && <p style={{ color: '#c0392b', fontSize: '0.9rem' }}>{t.no_match_error}</p>}

      <button
        type="submit"
        disabled={status === 'sending'}
        style={{
          width: '100%',
          padding: '0.9rem',
          background: '#000',
          color: '#fff',
          border: 'none',
          borderRadius: 999,
          fontSize: '1rem',
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          opacity: status === 'sending' ? 0.6 : 1,
        }}
      >
        {status === 'sending' ? '...' : t.submit}
      </button>
    </form>
  );
}
