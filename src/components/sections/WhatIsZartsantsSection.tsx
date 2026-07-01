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

const WHATIS_BUBBLES = ['/whatis-1.png', '/whatis-2.png', '/whatis-3.png', '/whatis-4.png'];

const WHATIS_CONFIG = [
  { top: 110, left: 280,  height: 180, textTop: 40, textLeft: 50, textWidth: 75, fontSize: 18 }, // bubble 1
  { top: 80, left: 1100, height: 180, textTop: 43, textLeft: 54, textWidth: 75, fontSize: 18 }, // bubble 2
  { top: 300, left:  280,  height: 120, textTop: 50, textLeft: 50, textWidth: 75, fontSize: 18 }, // bubble 3
  { top: 250, left: 1100, height: 100, textTop: 50, textLeft: 60, textWidth: 75, fontSize: 18 }, // bubble 4
];

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

      {/* Four individual bubbles — each positioned independently */}
      {[0, 1, 2, 3].map((bi) => {
        const cfg = WHATIS_CONFIG[bi];
        return (
          <div key={bi} style={{
            position: 'absolute',
            top: cfg.top, left: cfg.left,
            display: 'inline-block',
            zIndex: 1,
            transform: open ? 'translateY(0)' : 'translateY(-40px)',
            opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
            transition: 'transform 0.35s ease, opacity 0.35s ease',
          }}>
            <img
              src={WHATIS_BUBBLES[bi]}
              alt=""
              style={{ height: cfg.height, width: 'auto', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              top: `${cfg.textTop}%`, left: `${cfg.textLeft}%`,
              transform: 'translate(-50%, -50%)',
              width: `${cfg.textWidth}%`,
              textAlign: 'left',
              fontSize: cfg.fontSize,
              lineHeight: 1.4, color: '#000', fontWeight: 500,
              pointerEvents: 'none',
            }}>
              {bullets[bi]}
            </div>
          </div>
        );
      })}

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
            width: layout.charWidth, height: 'auto', display: 'block', zIndex: 2,
          }}
        />
      )}
    </div>
  );
}
