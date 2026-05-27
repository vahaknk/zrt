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
}


function parseBullets(html: string): string[] {
  const matches = html.match(/<li[^>]*>([\s\S]*?)<\/li>/g) ?? [];
  return matches.map(m => decodeHtml(m.replace(/<[^>]+>/g, '').trim())).filter(Boolean);
}

const BUBBLE_CONFIG = [
  { top: '11%', left: '13%', width: '420px', picOnLeft: true,  picOffset: '7%', picTop: '35%', textOffset: '8%', textTop: '45%' },
  { top: '24%', left: '12%', width: '420px', picOnLeft: false, picOffset: '4%', picTop: '50%', textOffset: '8%', textTop: '40%' },
  { top: '35%', left: '17%', width: '420px', picOnLeft: true,  picOffset: '4%', picTop: '30%', textOffset: '8%', textTop: '47%' },
  { top: '47%', left: '12%', width: '420px', picOnLeft: false, picOffset: '4%', picTop: '30%', textOffset: '8%', textTop: '36%' },
  { top: '57%', left: '18%', width: '420px', picOnLeft: true,  picOffset: '4%', picTop: '55%', textOffset: '8%', textTop: '40%' },
];

export default function WhatsThereSection({ section, directusUrl, layout }: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [bubbleLoaded, setBubbleLoaded] = useState(false);
  const bubbleRef = useRef<HTMLImageElement>(null);
  useEffect(() => { if (bubbleRef.current?.complete) setBubbleLoaded(true); }, []);
  const t = section.translations?.[0];
  const bullets = parseBullets(t?.Content ?? '');

  return (
    <div style={{
      width: `${layout.sectionWidth}vw`, height: '100vh', flexShrink: 0,
      position: 'relative', overflow: 'visible',
    }}>

      {/* Group: character + bubbles float together */}
      <div
        className={open ? undefined : 'whats-there-group'}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        {/* Main bubble (clickable) */}
        {section.bubble && (
          <div
            onClick={() => setOpen(o => !o)}
            className={open ? '' : 'bubble-hang'}
            style={{
              position: 'absolute', top: '46%', left: '68%',
              transform: 'translate(-50%, -50%)',
              zIndex: open ? 2 : 4, cursor: 'pointer', userSelect: 'none',
              display: 'inline-block',
            }}
          >
            <img
              ref={bubbleRef}
              src={asset(directusUrl, section.bubble)!}
              alt=""
              onLoad={() => setBubbleLoaded(true)}
              style={{ height: 'clamp(100px, 28vh, 200px)', width: 'auto', display: 'block', transform: 'scaleX(-1)' }}
            />
            <div style={{
              position: 'absolute', top: '42%', left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center', fontWeight: 700,
              fontSize: 'clamp(1rem, 2.8vh, 2rem)', lineHeight: 1.3, color: '#000',
              width: '60%', wordBreak: 'break-word', whiteSpace: 'normal',
              pointerEvents: 'none', paddingRight: '1rem',
              opacity: bubbleLoaded ? 1 : 0,
            }}>
              {decodeHtml(t?.Header ?? '')}
            </div>
          </div>
        )}

        {/* Content bubble stack */}
        {open && bullets.map((bullet, i) => {
              const cfg = BUBBLE_CONFIG[i] ?? BUBBLE_CONFIG[0];
              const bubbleTop = layout.bubbleStartTop + i * layout.bubbleGap;
              return (
                <div key={i} style={{
                  position: 'absolute',
                  top: `${bubbleTop}%`, left: cfg.left,
                  width: `${layout.bubbleWidth}px`,
                  height: `${layout.bubbleHeight}px`,
                  zIndex: 3,
                }}>
                  <img
                    src={`/whats_there_${i + 1}.webp`}
                    alt=""
                    style={{
                      width: '100%', height: '100%',
                      objectFit: 'fill', display: 'block',
                    }}
                  />
                  {/* Illustration */}
                  <img
                    src={`/whats_there_pic_${i + 1}.webp`}
                    alt=""
                    style={{
                      position: 'absolute',
                      top: cfg.picTop, transform: 'translateY(-50%)',
                      [cfg.picOnLeft ? 'left' : 'right']: cfg.picOffset,
                      height: '85%', width: 'auto',
                    }}
                  />
                  {/* Text */}
                  <div style={{
                    position: 'absolute',
                    top: cfg.textTop, transform: 'translateY(-50%)',
                    [cfg.picOnLeft ? 'right' : 'left']: cfg.textOffset,
                    width: '50%',
                    textAlign: 'left',
                    fontSize: 'clamp(0.75rem, 1.6vh, 1.15rem)',
                    fontWeight: 700, color: '#000',
                    wordBreak: 'break-word', whiteSpace: 'normal',
                    lineHeight: 1.3,
                  }}>
                    {bullet}
                  </div>
                </div>
              );
            })}

        {/* Characters illustration */}
        {section.main_image && (
          <img
            src={hovered && section.hoover_image ? asset(directusUrl, section.hoover_image)! : asset(directusUrl, section.main_image)!}
            alt=""
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              position: 'absolute', bottom: `${layout.charBottom}%`, left: `${layout.charLeft}%`,
              width: `${layout.charWidth}%`, height: 'auto', display: 'block',
              zIndex: 5,
            }}
          />
        )}
      </div>
    </div>
  );
}
