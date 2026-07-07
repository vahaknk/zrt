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
  lang: string;
}

const MONTHS_HY = [
  'Յունուար', 'Փետրուար', 'Մարտ', 'Ապրիլ', 'Մայիս', 'Յունիս',
  'Յուլիս', 'Օգոստոս', 'Սեպտեմբեր', 'Հոկտեմբեր', 'Նոյեմբեր', 'Դեկտեմբեր',
];
const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

// getDay() returns 0=Sunday, 1=Monday...
const WEEKDAYS_HY = [
  'Կիրակի', 'Երկուշաբթի', 'Երեքշաբթի', 'Չորեքշաբթի',
  'Հինգշաբթի', 'Ուրբաթ', 'Շաբաթ',
];
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const MONTHS_BY_LANG: Record<string, string[]> = { hyw: MONTHS_HY, en: MONTHS_EN, fr: MONTHS_FR };
const WEEKDAYS_BY_LANG: Record<string, string[]> = { hyw: WEEKDAYS_HY, en: WEEKDAYS_EN, fr: WEEKDAYS_FR };

const PARIS_TZ = 'Europe/Paris';

function hhmm(date: Date, tz?: string): string {
  return date.toLocaleTimeString('en-GB', {
    ...(tz ? { timeZone: tz } : {}),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDateParis(date: Date, lang: string): string {
  const months = MONTHS_BY_LANG[lang] ?? MONTHS_HY;
  const weekdays = WEEKDAYS_BY_LANG[lang] ?? WEEKDAYS_HY;
  // en-CA gives reliable YYYY-MM-DD
  const [year, monthIdx, day] = new Intl.DateTimeFormat('en-CA', { timeZone: PARIS_TZ })
    .format(date).split('-').map(Number);
  const weekdayShort = new Intl.DateTimeFormat('en', { timeZone: PARIS_TZ, weekday: 'short' }).format(date);
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = weekdays[wdMap[weekdayShort] ?? 0];
  return `${year} ${months[monthIdx - 1]} ${day}, ${weekday}`;
}

interface SlotTimes {
  date: string;
  paris: string;
  local: string;
  sameAsLocal: boolean;
}

function slotTimes(start: string, end: string, lang: string): SlotTimes {
  const s = new Date(start);
  const e = new Date(end);
  const paris = `${hhmm(s, PARIS_TZ)}–${hhmm(e, PARIS_TZ)}`;
  const local = `${hhmm(s)}–${hhmm(e)}`;
  return { date: formatDateParis(s, lang), paris, local, sameAsLocal: paris === local };
}

export default function SlotPicker({ registration, slots, token, labels, lang }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selected) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, slot_id: selected }),
      });
      if (res.ok) {
        window.location.href = `/book/confirmed?lang=${lang}`;
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
        <img
          src='/whats_there_pic_4.webp'
          alt=""
          style={{ width: '30%', maxHeight: 260, objectFit: 'cover', borderRadius: 12, marginBottom: '1.5rem', display: 'block' }}
        />
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          {labels['booking_welcome'] ?? 'Բարեւ'}{', '}{registration.full_name}
        </h1>


        <p style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '1rem', lineHeight: 1.6 }}>
          {labels['booking_intro'] ?? 'Հաճեցէք ընտրել ձեզի յարմար օրը եւ ժամը։'}
        </p>

        {slots.length === 0 ? (
          <p style={{ fontSize: '1rem' }}>
            {labels['no_slots'] ?? 'Այժմ յարմար ժամ չիկայ։'}
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
                  color: selected === slot.id ? '#ffffff' : '#000',
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
                  {(() => {
                    const t = slotTimes(slot.start_time, slot.end_time, lang);
                    return (
                      <>
                        <div style={{ fontWeight: 600 }}>{t.date}</div>
                        <div style={{ marginTop: '0.2rem' }}>
                          <span style={{ fontWeight: 600 }}>{labels['paris_time_label'] ?? 'Paris time'}: </span>{t.paris}
                        </div>
                        {!t.sameAsLocal && (
                          <div style={{ marginTop: '0.1rem', opacity: 0.8, fontSize: '0.9em' }}>
                            <span style={{ fontWeight: 600 }}>{labels['your_time_label'] ?? 'Your time'}: </span>{t.local}
                          </div>
                        )}
                      </>
                    );
                  })()}
                  {slot.notes && <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', opacity: 0.75 }}>{slot.notes}</div>}
                </div>
              </label>
            ))}

            {status === 'error' && (
              <p style={{ color: 'red', fontSize: '0.85rem' }}>{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={!selected || status === 'sending'}
              style={{
                marginTop: '0.5rem',
                padding: '0.8rem',
                background: '#000',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: '1rem',
                fontWeight: 700,
                cursor: selected ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                opacity: selected ? 1 : 0.5,
              }}
            >
              {status === 'sending' ? '...' : (labels['booking_confirm'] ?? 'հաստատել')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}