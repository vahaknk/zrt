import { decodeHtml } from '../../lib/text';
import { useState, useRef, useEffect } from 'react';
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
  progress?: number;
}


function parseBullets(html: string): string[] {
  const matches = html.match(/<li[^>]*>([\s\S]*?)<\/li>/g) ?? [];
  return matches.map(m => decodeHtml(m.replace(/<[^>]+>/g, '').trim())).filter(Boolean);
}

export default function WhatHappensSection({ section, directusUrl, layout, progress = 1 }: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [index, setIndex] = useState(0);
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
      width: layout.sectionWidth, minWidth: 1280, height: 800, flexShrink: 0,
      position: 'relative', overflow: 'visible',
    }}>

      {/* Main bubble (clickable) */}
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
            position: 'absolute', top: '40%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', fontWeight: 700,
            fontSize: 30, lineHeight: 1.3, color: '#000',
            width: '60%', wordBreak: 'break-word', whiteSpace: 'normal',
            pointerEvents: 'none', paddingRight: '1rem',
            opacity: bubbleLoaded ? 1 : 0,
          }}>
            {decodeHtml(t?.Header ?? '')}
          </div>

          {/* Content bubble */}
          <div style={{
            position: 'absolute', top: '-45%', left: '110%',
            zIndex: 3, display: 'inline-block',
            transform: open ? 'translateY(0)' : 'translateY(-40px)',
            opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none',
            transition: 'transform 0.35s ease, opacity 0.35s ease',
          }}>
              <img
                src="/what_happens_click_bubble.webp"
                alt=""
                style={{ height: 220, width: 'auto', display: 'block' }}
              />
              <div style={{
                position: 'absolute', top: '40%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '75%', textAlign: 'center',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                pointerEvents: 'all',
              }}>
                <button
                  onClick={e => { e.stopPropagation(); setIndex(i => Math.max(0, i - 1)); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '2.2rem', flexShrink: 0, opacity: index > 0 ? 1 : 0.2, color: '#fff',
                  }}
                >⬅</button>
                <span style={{
                  flex: 1,
                  fontSize: 25,
                  lineHeight: 1.5, color: '#ffffff', fontWeight: 400,
                  wordBreak: 'break-word', whiteSpace: 'normal',
                }}>
                  {bullets[index]}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); setIndex(i => Math.min(bullets.length - 1, i + 1)); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '2.2rem', flexShrink: 0, opacity: index < bullets.length - 1 ? 1 : 0.2, color: '#fff',
                  }}
                >⮕</button>
              </div>
            </div>
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
            width: layout.charWidth, height: 'auto', display: 'block',
            zIndex: 5,
          }}
        />
      )}
    </div>
  );
}
