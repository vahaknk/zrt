import { useState } from 'react';

interface Slot {
  id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  notes: string | null;
}

interface Registration {
  id: string;
  full_name: string;
  email: string;
}

interface Props {
  registration: Registration;
  slots: Slot[];
  token: string;
  labels: Record<string, string>;
}

const MONTHS_HY = [
  'Յունուար', 'Փետրուար', 'Մարտ', 'Ապրիլ', 'Մայիս', 'Յունիս',
  'Յուլիս', 'Օգոստոս', 'Սեպտեմբեր', 'Հոկտեմբեր', 'Նոյեմբեր', 'Դեկտեմբեր',
];

// getDay() returns 0=Sunday, 1=Monday...
const WEEKDAYS_HY = [
  'Կիրակի', 'Երկուշաբթի', 'Երեքշաբթի', 'Չորեքշաբթի',
  'Հինգշաբթի', 'Ուրբաթ', 'Շաբաթ',
];

function formatSlot(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const year = s.getFullYear();
  const month = MONTHS_HY[s.getMonth()];
  const day = s.getDate();
  const weekday = WEEKDAYS_HY[s.getDay()];
  const pad = (n: number) => String(n).padStart(2, '0');
  const timeS = `${pad(s.getHours())}:${pad(s.getMinutes())}`;
  const timeE = `${pad(e.getHours())}:${pad(e.getMinutes())}`;
  return `${year} ${month} ${day}, ${weekday} · ${timeS}–${timeE}`;
}

const INTERVIEW_LANGUAGES = [
  { id: 'hyw', label: 'Հայերէն' },
  { id: 'fr',  label: 'Français' },
  { id: 'en',  label: 'English' },
  { id: 'de',  label: 'Deutsch' },
  { id: 'it',  label: 'Italiano' },
  { id: 'tr',  label: 'Türkçe' },
];

export default function SlotPicker({ registration, slots, token, labels }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [interviewLang, setInterviewLang] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selected || !interviewLang) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, slot_id: selected, interview_language: interviewLang }),
      });
      if (res.ok) {
        window.location.href = '/book/confirmed';
      } else {
        const data = await res.json();
        setErrorMsg(data.error ?? 'Something went wrong.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Something went wrong.');
      setStatus('error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          {labels['booking_welcome'] ?? 'Բարեւ'}{', '}{registration.full_name}
        </h1>


        {/* Interview language selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '1rem', lineHeight: 1.6 }}>
            {labels['booking.language_selector'] ?? 'Զատեցէք ձեր հարցազրոյցի լեզուն։'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {INTERVIEW_LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setInterviewLang(lang.id)}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: 999,
                  border: '1px solid rgba(0,0,0,0.2)',
                  background: interviewLang === lang.id ? '#000' : '#fff',
                  color: interviewLang === lang.id ? '#9683fe' : '#000',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <p style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '1rem', lineHeight: 1.6 }}>
          {labels['booking_intro'] ?? 'Հաճեցէք ընտրել ձեզի յարմար ժամը։'}
        </p>

        {slots.length === 0 ? (
          <p style={{ fontSize: '1rem' }}>
            {labels['no_slots'] ?? 'Այժm азат ժam чкай։'}
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {slots.map((slot) => (
              <label
                key={slot.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  background: selected === slot.id ? '#000' : '#fff',
                  color: selected === slot.id ? '#9683fe' : '#000',
                  border: '1px solid rgba(0,0,0,0.15)',
                  borderRadius: 8,
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                <input
                  type="radio"
                  name="slot"
                  value={slot.id}
                  checked={selected === slot.id}
                  onChange={() => setSelected(slot.id)}
                  style={{ marginTop: 3, accentColor: '#9683fe', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>{formatSlot(slot.start_time, slot.end_time)}</div>
                  {slot.notes && <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', opacity: 0.75 }}>{slot.notes}</div>}
                </div>
              </label>
            ))}

            {status === 'error' && (
              <p style={{ color: 'red', fontSize: '0.85rem' }}>{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={!selected || !interviewLang || status === 'sending'}
              style={{
                marginTop: '0.5rem',
                padding: '0.8rem',
                background: '#000',
                color: '#9683fe',
                border: 'none',
                borderRadius: 8,
                fontSize: '1rem',
                fontWeight: 700,
                cursor: selected && interviewLang ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                opacity: selected && interviewLang ? 1 : 0.5,
              }}
            >
              {status === 'sending' ? '...' : (labels['booking_confirm'] ?? 'Հաstaвател')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}