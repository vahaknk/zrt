import { useState } from 'react';

interface Props {
  labels: Record<string, string>;
  sectionHeader: string;
  sectionContent: string;
  mainImage: string | null;
  directusUrl: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: '2.6rem',
  padding: '0.65rem 0.9rem',
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.15)',
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

export default function RegistrationSection({ labels, sectionHeader, sectionContent, mainImage, directusUrl }: Props) {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    birthday: '',
    city: '',
    consent: false,
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
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
        width: '40vw',
        height: '100vh',
        flexShrink: 0,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {mainImage ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            src={`${directusUrl}/assets/${mainImage}`}
            alt=""
            style={{ height: 'clamp(400px, 80vh, 700px)', width: 'auto', display: 'block' }}
          />
          <div style={{
            position: 'absolute', top: '20%', left: '28%',
            width: '35%', height: '63%',
            overflowY: 'auto', overflowX: 'hidden',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
        <div style={{ width: '100%' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>
          {sectionHeader}
        </h2>
        {sectionContent && (
          <div
            style={{ fontSize: '0.85rem', lineHeight: 1.4, marginBottom: '1.5rem' }}
            dangerouslySetInnerHTML={{ __html: sectionContent }}
          />
        )}

        {status === 'success' ? (
          <p style={{ fontSize: '1.1rem' }}>✓ {labels['submit_button'] ?? 'Submitted'}</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>

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

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>{labels['birthday']}</label>
                <input
                  style={inputStyle}
                  type="date"
                  value={form.birthday}
                  onChange={(e) => set('birthday', e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>{labels['city']}</label>
                <input
                  style={inputStyle}
                  type="text"
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                />
              </div>
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
                alignSelf: 'center',
                padding: '0.45rem 1.2rem',
                background: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: 999,
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#333')}
              onMouseLeave={e => (e.currentTarget.style.background = '#000')}
            >
              {status === 'sending' ? '...' : labels['submit_button']}
            </button>

          </form>
        )}
        </div>
          </div>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 480, padding: '2rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>{sectionHeader}</h2>
        </div>
      )}
    </div>
  );
}