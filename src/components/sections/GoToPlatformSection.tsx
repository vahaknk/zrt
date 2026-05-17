import { useState } from 'react';
import { asset } from '../../lib/asset';

interface Props {
  section: {
    id: number | string;
    main_image: string | null;
    hoover_image: string | null;
    bubble: string | null;
    translations: Array<{ Header: string; Content: string; languages_id: string }>;
  };
  directusUrl: string;
  onNavigateToRegistration: () => void;
}


export default function GoToPlatformSection({ section, directusUrl, onNavigateToRegistration }: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const t = section.translations?.[0];

  return (
    <div style={{
      width: '100vw', height: '100vh', flexShrink: 0,
      position: 'relative', overflow: 'visible',
    }}>

      {/* Main bubble (clickable) */}
      {section.bubble && (
        <div
          onClick={() => setOpen(o => !o)}
          className={open ? '' : 'bubble-hang'}
          style={{
            position: 'absolute', top: 360, left: 480,
            transform: 'translate(-50%, -50%)',
            zIndex: 4, cursor: 'pointer', userSelect: 'none',
            display: 'inline-block',
          }}
        >
          <img
            src={asset(directusUrl, section.bubble)!}
            alt=""
            style={{ height: 200, width: 'auto', display: 'block' }}
          />
          <div style={{
            position: 'absolute', top: '45%', left: '48%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', fontWeight: 700,
            fontSize: '1.5rem', lineHeight: 1.3, color: '#000',
            width: '60%', wordBreak: 'break-word', whiteSpace: 'normal',
            pointerEvents: 'none', paddingRight: '1rem',
          }}>
            {t?.Header ?? ''}
          </div>

          {/* Content bubble */}
          {open && (
            <div style={{
              position: 'absolute', top: -160, left: 750,
              zIndex: 3, display: 'inline-block', pointerEvents: 'none',
            }}>
              <img
                src="/contactus_content_bubble.webp"
                alt=""
                style={{ height: 420, width: 'auto', display: 'block' }}
              />
              <div
                style={{
                  position: 'absolute', top: '50%', left: '55%',
                  transform: 'translate(-50%, -50%)',
                  width: '70%', textAlign: 'center',
                  fontSize: '1rem', lineHeight: 1.6,
                  color: '#000', fontWeight: 500,
                  pointerEvents: 'all',
                }}
                className="contact-content"
                dangerouslySetInnerHTML={{ __html: t?.Content ?? '' }}
              />
              <button
                onClick={onNavigateToRegistration}
                style={{
                  position: 'absolute', bottom: '12%', left: '55%',
                  transform: 'translateX(-50%)',
                  pointerEvents: 'all',
                  background: '#000', color: '#fff',
                  border: 'none', borderRadius: 999,
                  padding: '0.45rem 1.2rem',
                  fontWeight: 700, fontSize: '0.95rem',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#333')}
                onMouseLeave={e => (e.currentTarget.style.background = '#000')}
              >
                Հետաքրքրուած եմ
              </button>
            </div>
          )}
        </div>
      )}

      {/* Character illustration */}
      {section.main_image && (
        <img
          src={hovered && section.hoover_image ? asset(directusUrl, section.hoover_image)! : asset(directusUrl, section.main_image)!}
          alt=""
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: 'absolute', bottom: 130, left: 700,
            width: '500px', height: 'auto', display: 'block',
            zIndex: 5,
          }}
        />
      )}
    </div>
  );
}
