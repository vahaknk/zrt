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
  layout: Record<string, number>;
}


function parseBullets(html: string): string[] {
  const matches = html.match(/<li[^>]*>([\s\S]*?)<\/li>/g) ?? [];
  return matches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
}

export default function WhatHappensSection({ section, directusUrl, layout }: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [index, setIndex] = useState(0);
  const t = section.translations?.[0];
  const bullets = parseBullets(t?.Content ?? '');

  return (
    <div style={{
      width: `${layout.sectionWidth}vw`, height: '100vh', flexShrink: 0,
      position: 'relative', overflow: 'visible',
    }}>

      {/* Main bubble (clickable) */}
      {section.bubble && (
        <div
          onClick={() => setOpen(o => !o)}
          className={open ? '' : 'bubble-hang'}
          style={{
            position: 'absolute', top: '35%', left: '25%',
            transform: 'translate(-50%, -50%)',
            zIndex: 4, cursor: 'pointer', userSelect: 'none',
            display: 'inline-block',
          }}
        >
          <img
            src={asset(directusUrl, section.bubble)!}
            alt=""
            style={{ height: 'clamp(100px, 28vh, 200px)', width: 'auto', display: 'block' }}
          />
          <div style={{
            position: 'absolute', top: '40%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', fontWeight: 700,
            fontSize: 'clamp(1rem, 2.8vh, 2rem)', lineHeight: 1.3, color: '#000',
            width: '60%', wordBreak: 'break-word', whiteSpace: 'normal',
            pointerEvents: 'none', paddingRight: '1rem',
          }}>
            {t?.Header ?? ''}
          </div>

          {/* Content bubble */}
          {open && (
            <div style={{
              position: 'absolute', top: '-45%', left: '110%',
              zIndex: 3, display: 'inline-block', pointerEvents: 'none',
            }}>
              <img
                src="/what_happens_click_bubble.webp"
                alt=""
                style={{ height: 'clamp(180px, 42vh, 220px)', width: 'auto', display: 'block' }}
              />
              <div style={{
                position: 'absolute', top: '45%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '75%', textAlign: 'center',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                pointerEvents: 'all',
              }}>
                <button
                  onClick={e => { e.stopPropagation(); setIndex(i => Math.max(0, i - 1)); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '1.4rem', flexShrink: 0, opacity: index > 0 ? 1 : 0.2, color: '#fff',
                  }}
                >‹</button>
                <span style={{
                  flex: 1,
                  fontSize: 'clamp(0.9rem, 2vh, 1.4rem)',
                  lineHeight: 1.5, color: '#ffffff', fontWeight: 500,
                  wordBreak: 'break-word', whiteSpace: 'normal',
                }}>
                  {bullets[index]}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); setIndex(i => Math.min(bullets.length - 1, i + 1)); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '1.4rem', flexShrink: 0, opacity: index < bullets.length - 1 ? 1 : 0.2, color: '#fff',
                  }}
                >›</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Characters illustration */}
      {section.main_image && (
        <img
          src={hovered && section.hoover_image ? asset(directusUrl, section.hoover_image)! : asset(directusUrl, section.main_image)!}
          alt=""
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: 'absolute', bottom: layout.charBottom, left: layout.charLeft,
            width: '100vmax', height: 'auto', display: 'block',
            zIndex: 5,
          }}
        />
      )}
    </div>
  );
}
