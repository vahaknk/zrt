import { useState } from 'react';
import { decodeHtml } from '../../lib/text';

interface Props {
  labels: Record<string, string>;
  sectionHeader: string;
  sectionContent: string;
  mainImage: string | null;
  directusUrl: string;
  layout: Record<string, number>;
  mobileMode?: boolean;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: '2.0rem',
  padding: '0.4rem 0.7rem',
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.15)',
  borderRadius: 8,
  fontSize: '0.85rem',
  color: '#000',
  outline: 'none',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  lineHeight: 1.1,
  marginBottom: '0.15rem',
  color: '#000',
};

export default function RegistrationSection({ labels, sectionHeader, sectionContent, mainImage, directusUrl, layout, mobileMode }: Props) {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    birthday: '',
    city: '',
    interview_language: '',
    mailing_language: '',
    consent: false,
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error' | 'duplicate_booking' | 'duplicate_pending'>('idle');

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
      if (res.ok) {
        setStatus('success');
      } else if (res.status === 409) {
        const data = await res.json().catch(() => null);
        setStatus(data?.error === 'duplicate_pending' ? 'duplicate_pending' : 'duplicate_booking');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (mobileMode) {
    return (
      <div>
        {status === 'success' ? (
          <p style={{ fontSize: '1.1rem' }}>✓ {labels['success_message'] ?? 'Submitted'}</p>
        ) : status === 'duplicate_booking' ? (
          <p style={{ fontSize: '1rem' }}>{labels['duplicate_booking_message'] ?? 'This email has already booked an interview slot.'}</p>
        ) : status === 'duplicate_pending' ? (
          <p style={{ fontSize: '1rem' }}>{labels['duplicate_pending_message'] ?? 'This email already has a pending registration. Please check your inbox for the booking link.'}</p>
        ) : (
          <>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.4rem', lineHeight: 1.3 }}>
              {decodeHtml(sectionHeader)}
            </h2>
            {sectionContent && (
              <div style={{ fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '0.6rem' }}
                dangerouslySetInnerHTML={{ __html: sectionContent }} />
            )}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <label style={labelStyle}>{labels['name_label']}</label>
                <input style={inputStyle} type="text" placeholder={labels['name_placeholder']} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>{labels['email_label']}</label>
                <input style={inputStyle} type="email" placeholder={labels['email_placeholder']} value={form.email} onChange={(e) => set('email', e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>{labels['birthday']}</label>
                <input style={inputStyle} type="date" value={form.birthday} onChange={(e) => set('birthday', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>{labels['city']}</label>
                <input style={inputStyle} type="text" value={form.city} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>{labels['interview_language'] ?? 'Interview language'}</label>
                  <select style={inputStyle} value={form.interview_language} onChange={(e) => set('interview_language', e.target.value)} required>
                    <option value="" disabled>{labels['select_placeholder'] ?? '—'}</option>
                    <option value="hyw">{labels['lang_hyw'] ?? 'Հայերէն'}</option>
                    <option value="fr">{labels['lang_fr'] ?? 'Français'}</option>
                    <option value="en">{labels['lang_en'] ?? 'English'}</option>
                    <option value="de">{labels['lang_de'] ?? 'Deutsch'}</option>
                    <option value="it">{labels['lang_it'] ?? 'Italiano'}</option>
                    <option value="tr">{labels['lang_tr'] ?? 'Türkçe'}</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>{labels['mailing_language'] ?? 'Mailing language'}</label>
                  <select style={inputStyle} value={form.mailing_language} onChange={(e) => set('mailing_language', e.target.value)} required>
                    <option value="" disabled>{labels['select_placeholder'] ?? '—'}</option>
                    <option value="hyw">{labels['lang_hyw'] ?? 'Հայերէն'}</option>
                    <option value="fr">{labels['lang_fr'] ?? 'Français'}</option>
                    <option value="en">{labels['lang_en'] ?? 'English'}</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                <input type="checkbox" id="consent-mobile" checked={form.consent} onChange={(e) => set('consent', e.target.checked)} required style={{ marginTop: 3, flexShrink: 0 }} />
                <label htmlFor="consent-mobile" style={{ fontSize: '0.85rem', color: '#000', cursor: 'pointer' }}>{labels['consent_label']}</label>
              </div>
              {status === 'error' && <p style={{ color: 'red', fontSize: '0.85rem' }}>Something went wrong. Please try again.</p>}
              <button type="submit" disabled={status === 'sending'} style={{ alignSelf: 'center', padding: '0.6rem 1.5rem', background: '#000', color: '#fff', border: 'none', borderRadius: 999, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {status === 'sending' ? '...' : labels['submit_button']}
              </button>
            </form>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        width: layout.sectionWidth,
        minWidth: 1280,
        height: 800,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {mainImage ? (
        <div style={{
          position: 'absolute',
          top: layout.imgTop,
          left: layout.imgLeft,
          transform: 'translateX(-50%)',
          display: 'inline-block',
        }}>
          <img
            src={`${directusUrl}/assets/${mainImage}`}
            alt=""
            style={{ height: layout.imgHeight, width: 'auto', display: 'block' }}
          />
          <div style={{
            position: 'absolute',
            top: `${layout.formTop}%`, left: `${layout.formLeft}%`,
            width: `${layout.formWidth}%`, height: `${layout.formHeight}%`,
            overflowY: 'auto', overflowX: 'hidden',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
        <div style={{ width: '100%' }}>
        {status === 'success' ? (
          <p style={{ fontSize: '1.1rem' }}>✓ {labels['success_message'] ?? 'Submitted'}</p>
        ) : status === 'duplicate_booking' ? (
          <p style={{ fontSize: '0.9rem' }}>{labels['duplicate_booking_message'] ?? 'This email has already booked an interview slot.'}</p>
        ) : status === 'duplicate_pending' ? (
          <p style={{ fontSize: '0.9rem' }}>{labels['duplicate_pending_message'] ?? 'This email already has a pending registration. Please check your inbox for the booking link.'}</p>
        ) : (
          <>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            {decodeHtml(sectionHeader)}
          </h2>
          {sectionContent && (
            <div
              style={{ fontSize: '0.78rem', lineHeight: 1.3, marginBottom: '0.6rem' }}
              dangerouslySetInnerHTML={{ __html: sectionContent }}
            />
          )}
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

            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-end' }}>
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

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>{labels['interview_language'] ?? 'Interview language'}</label>
                <select
                  style={inputStyle}
                  value={form.interview_language}
                  onChange={(e) => set('interview_language', e.target.value)}
                  required
                >
                  <option value="" disabled>{labels['select_placeholder'] ?? '—'}</option>
                  <option value="hyw">{labels['lang_hyw'] ?? 'Հայերէն'}</option>
                  <option value="fr">{labels['lang_fr'] ?? 'Français'}</option>
                  <option value="en">{labels['lang_en'] ?? 'English'}</option>
                  <option value="de">{labels['lang_de'] ?? 'Deutsch'}</option>
                  <option value="it">{labels['lang_it'] ?? 'Italiano'}</option>
                  <option value="tr">{labels['lang_tr'] ?? 'Türkçe'}</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>{labels['mailing_language'] ?? 'Mailing language'}</label>
                <select
                  style={inputStyle}
                  value={form.mailing_language}
                  onChange={(e) => set('mailing_language', e.target.value)}
                  required
                >
                  <option value="" disabled>{labels['select_placeholder'] ?? '—'}</option>
                  <option value="hyw">{labels['lang_hyw'] ?? 'Հայերէն'}</option>
                  <option value="fr">{labels['lang_fr'] ?? 'Français'}</option>
                  <option value="en">{labels['lang_en'] ?? 'English'}</option>
                </select>
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
          </>
        )}
        </div>
          </div>
        </div>
      ) : (
        <div style={{ width: '99%', maxWidth: 480, padding: '2rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>{decodeHtml(sectionHeader)}</h2>
        </div>
      )}
    </div>
  );
}
