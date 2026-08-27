import { useState, useEffect, useRef } from 'react';
import {
  type Lang,
  type Weekday,
  type ParticipantType,
  LANGS,
  WEEKDAYS,
  GRID_TIMES,
  DAY_SLOTS,
  WEEKDAY_SHORT_LABELS,
  CALENDAR_WEEKDAYS,
  MONTH_LABELS,
  TIMEZONE_GROUPS,
  PROFICIENCY_OPTIONS,
  ADULT_PROFICIENCY_OPTIONS,
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


function parseDMY(v: string): { d: number; m: number; y: number } | null {
  const match = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  return { d: Number(match[1]), m: Number(match[2]) - 1, y: Number(match[3]) };
}

function formatDMY(d: number, m: number, y: number): string {
  return `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// 0=Monday..6=Sunday, matching CALENDAR_WEEKDAYS' order.
function firstWeekdayMonFirst(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

interface BirthdayPickerProps {
  value: string; // "DD/MM/YYYY" or ''
  onChange: (v: string) => void;
  lang: Lang;
  placeholder: string;
}

function BirthdayPicker({ value, onChange, lang, placeholder }: BirthdayPickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = parseDMY(value);
  const [viewYear, setViewYear] = useState(() => parsed?.y ?? new Date().getFullYear() - 10);
  const [viewMonth, setViewMonth] = useState(() => parsed?.m ?? 0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const openPicker = () => {
    const p = parseDMY(value);
    if (p) {
      setViewYear(p.y);
      setViewMonth(p.m);
    }
    setOpen(true);
  };

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  const numDays = daysInMonth(viewYear, viewMonth);
  const startOffset = firstWeekdayMonFirst(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: numDays }, (_, i) => i + 1),
  ];

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          pattern="\d{1,2}/\d{1,2}/\d{4}"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openPicker())}
          aria-label="calendar"
          style={{ width: 44, border, borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: '1.1rem' }}
        >
          📅
        </button>
      </div>
      {open && (
        <div
          style={{
            position: 'absolute', zIndex: 10, top: '110%', left: 0,
            background: '#fff', border, borderRadius: 8, padding: '0.75rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)', width: 260,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <button type="button" onClick={() => changeMonth(-1)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem', color: '#000' }}>‹</button>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#000' }}>{MONTH_LABELS[lang][viewMonth]} {viewYear}</div>
            <button type="button" onClick={() => changeMonth(1)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem', color: '#000' }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: '0.25rem' }}>
            {CALENDAR_WEEKDAYS[lang].map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(0,0,0,0.5)' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              const selected = day !== null && parsed && parsed.d === day && parsed.m === viewMonth && parsed.y === viewYear;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={day === null}
                  onClick={() => {
                    if (day) {
                      onChange(formatDMY(day, viewMonth, viewYear));
                      setOpen(false);
                    }
                  }}
                  style={{
                    height: 28,
                    border: 'none',
                    borderRadius: 6,
                    background: selected ? '#000' : 'transparent',
                    color: day === null ? 'transparent' : selected ? '#fff' : '#000',
                    cursor: day ? 'pointer' : 'default',
                    fontSize: '0.8rem',
                  }}
                >
                  {day ?? ''}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
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

// Renders "...text **bold** text..." with the marked segment wrapped in <strong>.
function renderBold(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

export default function MinorRegistrationForm({ initialLang }: Props) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [participantType, setParticipantType] = useState<ParticipantType>('minor');
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [timezone, setTimezone] = useState('Europe/Paris');
  const t = FIELD_LABELS[lang];

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected && TIMEZONE_GROUPS.some((g) => g.tz === detected)) setTimezone(detected);
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
          timezone,
        }),
      });
      setStatus(res.ok ? 'success' : 'error');
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
      )}

      {participantType === 'minor' && (
        <div style={sectionStyle}>
          <label style={labelStyle}>{t.participant_name}</label>
          <input style={inputStyle} type="text" value={form.participant_name} onChange={(e) => set('participant_name', e.target.value)} required />
        </div>
      )}

      <div style={sectionStyle}>
        <label style={labelStyle}>{participantType === 'adult' ? t.participant_birthday_adult : t.participant_birthday}</label>
        <BirthdayPicker
          value={form.participant_birthday}
          onChange={(v) => set('participant_birthday', v)}
          lang={lang}
          placeholder={t.birthday_format}
        />
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
        <label style={labelStyle}>{participantType === 'adult' ? t.proficiency_adult : t.proficiency}</label>
        {(participantType === 'adult' ? ADULT_PROFICIENCY_OPTIONS : PROFICIENCY_OPTIONS).map((opt) => (
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
        <label style={labelStyle}>{participantType === 'adult' ? t.interests_adult : t.interests}</label>
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
        <label style={labelStyle}>{participantType === 'adult' ? t.availability_title_adult : t.availability_title}</label>

        <div style={{ marginBottom: '0.75rem', maxWidth: 420 }}>
          <label style={labelStyle}>{t.timezone_label}</label>
          <select style={inputStyle} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {TIMEZONE_GROUPS.map((g) => (
              <option key={g.tz} value={g.tz}>{g.label[lang]}</option>
            ))}
          </select>
        </div>

        <p style={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.85rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>{renderBold(t.availability_hint)}</p>

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
                    {time}
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
