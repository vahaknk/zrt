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
}


export default function OurApproachSection({ section, directusUrl }: Props) {
  const [open, setOpen] = useState(false);
  const t = section.translations?.[0];

  return (
    <div style={{
      width: '75vw', height: '100vh', flexShrink: 0,
      position: 'relative', overflow: 'visible',
    }}>

      {/* Yellow speech bubble (left of center) */}
      {section.bubble && (
        <div
          onClick={() => setOpen(o => !o)}
          className={open ? '' : 'bubble-hang'}
          style={{
            position: 'absolute', top: '36%', left: '48%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2, display: 'inline-block', cursor: 'pointer', userSelect: 'none',
          }}>
          <img
            src={asset(directusUrl, section.bubble)!}
            alt=""
            style={{ height: 'clamp(100px, 28vh, 260px)', width: 'auto', display: 'block', transform: 'scaleX(-1) rotate(-20deg)' }}
          />
          <div style={{
            position: 'absolute', top: '50%', left: '60%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', fontWeight: 700,
            fontSize: 'clamp(1rem, 2.8vh, 2rem)', lineHeight: 1.3, color: '#000',
            width: '60%', wordBreak: 'break-word', whiteSpace: 'normal',
            pointerEvents: 'none', paddingRight: '1rem',
          }}>
            {t?.Header ?? ''}
          </div>
        </div>
      )}

      {/* Right column: bird + text */}
      {open && <div style={{
        position: 'absolute', top: '8%', right: '-20%',
        width: '50%', zIndex: 2,
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
      }}>
        {section.hoover_image && (
          <img
            src={asset(directusUrl, section.hoover_image)!}
            alt=""
            style={{ height: 80, width: 'auto' }}
          />
        )}
        <div
          style={{ fontSize: '1.2rem', lineHeight: 1.75, color: '#fff' }}
          dangerouslySetInnerHTML={{ __html: t?.Content ?? '' }}
        />
      </div>}

      {/* Characters illustration */}
      {section.main_image && (
        <img
          src={asset(directusUrl, section.main_image)!}
          alt=""
          style={{
            position: 'absolute', bottom: 91, left: 320,
            width: '130%', height: 'auto', display: 'block',
          }}
        />
      )}
    </div>
  );
}