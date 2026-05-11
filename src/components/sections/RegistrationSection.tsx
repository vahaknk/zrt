import { useState } from 'react';

interface Props {
  labels: Record<string, string>;
  sectionHeader: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.9rem',
  background: 'rgba(0,0,0,0.08)',
  border: '1px solid rgba(0,0,0,0.2)',
  borderRadius: 8,
  fontSize: '0.95rem',
  color: '#000',
  outline: 'none',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  marginBottom: '0.3rem',
  color: '#000',
};

export default function RegistrationSection({ labels, sectionHeader }: Props) {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    birthday: '',
    city: '',
    armenian_level: '',
    notes: '',
    consent: false,
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: 480 }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          {sectionHeader}
        </h2>

        {status === 'success' ? (
          <p style={{ fontSize: '1.1rem' }}>✓ {labels['submit_button'] ?? 'Submitted'}</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>

            <div>
              <label style={labelStyle}>{labels['name_label']}</label>
              <input
                style={inputStyle}
                type="text"
                placeholder={labels['name_placeholder']}
                value={form.full_name}
                onChange={(e) => set('full_name', e.target.value)}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>{labels['email_label']}</label>
              <input
                style={inputStyle}
                type="email"
                placeholder={labels['email_placeholder']}
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>{labels['phone_label']}</label>
              <input
                style={inputStyle}
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>{labels['birthday']}</label>
              <input
                style={inputStyle}
                type="date"
                value={form.birthday}
                onChange={(e) => set('birthday', e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>{labels['city']}</label>
              <input
                style={inputStyle}
                type="text"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>
                {labels['armenian_level']} — {form.armenian_level || '—'}
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={form.armenian_level || 1}
                onChange={(e) => set('armenian_level', e.target.value)}
                style={{ width: '100%', accentColor: '#9683fe' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#555', marginTop: '0.2rem' }}>
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>

            <div>
              <label style={labelStyle}>{labels['notes_label']}</label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                placeholder={labels['notes_placeholder']}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <input
                type="checkbox"
                id="consent"
                checked={form.consent}
                onChange={(e) => set('consent', e.target.checked)}
                required
                style={{ marginTop: 3, flexShrink: 0 }}
              />
              <label htmlFor="consent" style={{ fontSize: '0.85rem', color: '#000', cursor: 'pointer' }}>
                {labels['consent_label']}
              </label>
            </div>

            {status === 'error' && (
              <p style={{ color: 'red', fontSize: '0.85rem' }}>Something went wrong. Please try again.</p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              style={{
                padding: '0.8rem',
                background: '#000',
                color: '#9683fe',
                border: 'none',
                borderRadius: 8,
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {status === 'sending' ? '...' : labels['submit_button']}
            </button>

          </form>
        )}
      </div>
    </div>
  );
}