import { useState } from 'react';
import { asset } from '../../lib/asset';

interface Props {
  section: {
    id: number | string;
    main_image: string | null;
    bubble: string | null;
    translations: Array<{ Header: string; Content: string; languages_id: string }>;
  };
  directusUrl: string;
}

const LEFT_BALLOONS  = ['/top-left.webp',  '/bottom-left.webp'];
const RIGHT_BALLOONS = ['/top-right.webp', '/bottom-right.webp'];

function parseBullets(html: string): string[] {
  const matches = html.match(/<li[^>]*>([\s\S]*?)<\/li>/g) ?? [];
  return matches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
}

export default function WhatIsZartsantsSection({ section, directusUrl }: Props) {
  const [open, setOpen] = useState(false);
  const t = section.translations?.[0];
  const bullets = parseBullets(t?.Content ?? '');

  return (
    <div style={{
      width: '100vw', height: '100vh', flexShrink: 0,
      position: 'relative', overflow: 'visible',
    }}>

      {/* Left column */}
      {open && (
        <div style={{
          position: 'absolute', top: '30%', left: '5%',
          transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: '1rem',
          maxWidth: '22%', zIndex: 2,
        }}>
          {[0, 2].map((bi, row) => (
            <div key={row} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <img src={LEFT_BALLOONS[row]} alt="" style={{ height: 80, width: 60, objectFit: 'contain', flexShrink: 0 }} />
              <p style={{ fontSize: '1.2rem', lineHeight: 1.5, color: '#fff', margin: 0 }}>
                {bullets[bi]}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Right column */}
      {open && (
        <div style={{
          position: 'absolute', top: '30%', right: '5%',
          transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: '1rem',
          maxWidth: '22%', zIndex: 2,
        }}>
          {[1, 3].map((bi, row) => (
            <div key={row} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <img src={RIGHT_BALLOONS[row]} alt="" style={{ height: 80, width: 60, objectFit: 'contain', flexShrink: 0 }} />
              <p style={{ fontSize: '1.2rem', lineHeight: 1.5, color: '#fff', margin: 0 }}>
                {bullets[bi]}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Golden divider line */}
      {/* {open && (
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0,
          height: 2, background: '#C8942A', zIndex: 1,
        }} />
      )} */}

      {/* Yellow speech bubble */}
      {section.bubble && (
        <div
          onClick={() => setOpen(o => !o)}
          className={open ? '' : 'bubble-hang'}
          style={{
            position: 'absolute', top: '36%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 4, cursor: 'pointer', userSelect: 'none',
            display: 'inline-block',
          }}
        >
          <img
            src={asset(directusUrl, section.bubble)!}
            alt=""
            style={{ height: 'clamp(100px, 28vh, 260px)', width: 'auto', display: 'block' }}
          />
          <div style={{
            position: 'absolute', top: '45%', left: '48%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', fontWeight: 700,
            fontSize: 'clamp(1rem, 2.8vh, 2rem)', lineHeight: 1.3, color: '#000',
            width: '60%', wordBreak: 'break-word', whiteSpace: 'normal', pointerEvents: 'none', paddingRight: '1rem',
          }}>
            {t?.Header ?? ''}
          </div>
        </div>
      )}

      {/* Characters illustration */}
      {section.main_image && (
        <img
          src={asset(directusUrl, section.main_image)!}
          alt=""
          style={{
            position: 'absolute', bottom: 7, left: 666,
            width: '100vmax', height: 'auto', display: 'block',
          }}
        />
      )}
    </div>
  );
}