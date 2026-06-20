import { decodeHtml } from '../../lib/text';
import { useState, useRef, useEffect } from 'react';
import { asset } from '../../lib/asset';

interface Props {
  section: {
    id: number | string;
    main_image: string | null;
    bubble: string | null;
    translations: Array<{ Header: string; Content: string; languages_id: string }>;
  };
  directusUrl: string;
  layout: Record<string, number>;
  progress?: number;
}

const LEFT_BALLOONS  = ['/top-left.webp',  '/bottom-left.webp'];
const RIGHT_BALLOONS = ['/top-right.webp', '/bottom-right.webp'];

function parseBullets(html: string): string[] {
  const matches = html.match(/<li[^>]*>([\s\S]*?)<\/li>/g) ?? [];
  return matches.map(m => decodeHtml(m.replace(/<[^>]+>/g, '').trim())).filter(Boolean);
}

export default function WhatIsZartsantsSection({ section, directusUrl, layout, progress = 1 }: Props) {
  const [open, setOpen] = useState(false);
  const [bubbleLoaded, setBubbleLoaded] = useState(false);
  const bubbleRef = useRef<HTMLImageElement>(null);
  useEffect(() => { if (bubbleRef.current?.complete) setBubbleLoaded(true); }, []);
  useEffect(() => { if (progress < 0.5) setOpen(false); }, [progress]);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  useEffect(() => {
    if (progress > 0.3) setBubbleVisible(true);
    else if (progress < 0.1) setBubbleVisible(false);
    else if (progress < 0.1) setBubbleVisible(false);
  }, [progress]);
  const t = section.translations?.[0];
  const bullets = parseBullets(t?.Content ?? '');

  return (
    <div style={{
      width: 1920, minWidth: 1280, height: 800, flexShrink: 0,
      position: 'relative', overflow: 'visible',
    }}>

      {/* Left column */}
      <div style={{
        position: 'absolute', top: '30%', left: '5%',
        display: 'flex', flexDirection: 'column', gap: '1rem',
        maxWidth: '22%', zIndex: 2,
        transform: open ? 'translateY(-50%)' : 'translateY(calc(-50% - 40px))',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'transform 0.35s ease, opacity 0.35s ease',
      }}>
        {[0, 2].map((bi, row) => (
          <div key={row} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <img src={LEFT_BALLOONS[row]} alt="" style={{ height: 80, width: 60, objectFit: 'contain', flexShrink: 0 }} />
            <p style={{ fontSize: 20, lineHeight: 1.5, color: '#fff', margin: 0 }}>
              {bullets[bi]}
            </p>
          </div>
        ))}
      </div>

      {/* Right column */}
      <div style={{
        position: 'absolute', top: '30%', right: '5%',
        display: 'flex', flexDirection: 'column', gap: '1rem',
        maxWidth: '22%', zIndex: 2,
        transform: open ? 'translateY(-50%)' : 'translateY(calc(-50% - 40px))',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'transform 0.35s ease, opacity 0.35s ease',
      }}>
        {[1, 3].map((bi, row) => (
          <div key={row} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <img src={RIGHT_BALLOONS[row]} alt="" style={{ height: 80, width: 60, objectFit: 'contain', flexShrink: 0 }} />
            <p style={{ fontSize: 20, lineHeight: 1.5, color: '#fff', margin: 0 }}>
              {bullets[bi]}
            </p>
          </div>
        ))}
      </div>

      {/* Yellow speech bubble */}
      {section.bubble && (
        <div
          onClick={() => setOpen(o => !o)}
          className={open ? '' : 'bubble-hang'}
          style={{
            position: 'absolute', top: layout.bubbleTop, left: layout.bubbleLeft,
            transform: bubbleVisible ? 'translate(-50%, -50%) rotate(0deg)' : 'translate(-50%, calc(-50% - 120px)) rotate(0deg)',
            opacity: bubbleVisible ? 1 : 0,
            transition: 'transform 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.3s, opacity 0.9s ease 0.3s',
            zIndex: 4, cursor: 'pointer',
            userSelect: 'none',
            display: 'inline-block',
          }}
        >
          <img
            ref={bubbleRef}
            src={asset(directusUrl, section.bubble)!}
            alt=""
            onLoad={() => setBubbleLoaded(true)}
            style={{ height: layout.bubbleHeight, width: 'auto', display: 'block' }}
          />
          <div style={{
            position: 'absolute', top: '48%', left: '47%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', fontWeight: 700,
            fontSize: 26, lineHeight: 1.3, color: '#000',
            width: '60%', wordBreak: 'break-word', whiteSpace: 'normal', pointerEvents: 'none', paddingRight: '1rem',
            opacity: bubbleLoaded ? 1 : 0,
          }}>
            {decodeHtml(t?.Header ?? '')}
          </div>
        </div>
      )}

      {/* Characters illustration */}
      {section.main_image && (
        <img
          src={asset(directusUrl, section.main_image)!}
          alt=""
          style={{
            position: 'absolute', bottom: layout.charBottom, left: layout.charLeft,
            width: layout.charWidth, height: 'auto', display: 'block',
          }}
        />
      )}
    </div>
  );
}
