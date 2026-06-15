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
  return matches.map(m => m.replace(/^<li[^>]*>|<\/li>$/g, '').trim()).filter(Boolean);
}

const BUBBLE_CONFIG = [
  // Row 1 — left of character
  { topPct: 8.7, left: '13%', picOnLeft: true,  picOffset: '7%', picTop: '35%', textOffset: '8%', textTop: '45%', flip: false, scale: 1 },
  { topPct: 24, left: '12%', picOnLeft: false, picOffset: '4%', picTop: '50%', textOffset: '8%', textTop: '40%', flip: false, scale: 1 },
  { topPct: 37, left: '17%', picOnLeft: true,  picOffset: '4%', picTop: '30%', textOffset: '8%', textTop: '47%', flip: false, scale: 1 },
  { topPct: 50.5, left: '12%', picOnLeft: false, picOffset: '4%', picTop: '30%', textOffset: '8%', textTop: '36%', flip: false, scale: 1 },
  { topPct: 62, left: '18%', picOnLeft: true,  picOffset: '4%', picTop: '55%', textOffset: '8%', textTop: '40%', flip: false, scale: 1 },
  // Row 2 — right of character (mirrored horizontally)
  { topPct: 20, left: 'calc(60% + 450px)', picOnLeft: false, picOffset: '4%', picTop: '35%', textOffset: '8%', textTop: '58%', flip: false, scale: 1 },
  { topPct: 35, left: 'calc(56% + 450px)', picOnLeft: false,  picOffset: '7%', picTop: '50%', textOffset: '6%', textTop: '38%', flip: false, scale: 1.2 },
  { topPct: 49, left: 'calc(64% + 450px)', picOnLeft: false, picOffset: '4%', picTop: '30%', textOffset: '8%', textTop: '40%', flip: false, scale: 1.0 },
  { topPct: 63, left: 'calc(55% + 450px)', picOnLeft: false,  picOffset: '4%', picTop: '30%', textOffset: '6%', textTop: '50%', flip: false, scale: 1.25 },
  { topPct: 59, left: 'calc(54% + 450px)', picOnLeft: false, picOffset: '4%', picTop: '55%', textOffset: '8%', textTop: '47%', flip: true, scale: 1.2 },
];

export default function WhatsThereSection({ section, directusUrl, layout, progress = 1 }: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
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

      {/* Group: character + bubbles float together */}
      <div
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        {/* Main bubble (clickable) */}
        {section.bubble && (
          <div
            onClick={() => setOpen(o => !o)}
            className={open ? '' : 'bubble-hang'}
            style={{
              position: 'absolute', top: layout.bubbleTop, left: layout.bubbleLeft,
              transform: bubbleVisible ? 'translate(-50%, -50%)' : 'translate(-50%, calc(-50% - 120px))',
              opacity: bubbleVisible ? 1 : 0,
              transition: 'transform 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.3s, opacity 0.9s ease 0.3s',
              zIndex: open ? 2 : 4, cursor: 'pointer',
              userSelect: 'none',
              display: 'inline-block',
            }}
          >
            <img
              ref={bubbleRef}
              src={asset(directusUrl, section.bubble)!}
              alt=""
              onLoad={() => setBubbleLoaded(true)}
              style={{ height: layout.bubbleHeight, width: 'auto', display: 'block', transform: 'scaleX(-1)' }}
            />
            <div style={{
              position: 'absolute', top: '42%', left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center', fontWeight: 700,
              fontSize: 22, lineHeight: 1.3, color: '#000',
              width: '60%', wordBreak: 'break-word', whiteSpace: 'normal',
              pointerEvents: 'none', paddingRight: '1rem',
              opacity: bubbleLoaded ? 1 : 0,
            }}>
              {decodeHtml(t?.Header ?? '')}
            </div>
          </div>
        )}

        {/* Content bubble stack */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          transform: open ? 'translateY(0)' : 'translateY(-40px)',
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
          transition: 'transform 0.35s ease, opacity 0.35s ease',
        }}>
          {/* Second column heading */}
          {bullets.length > 5 && (() => {
            const COL2_HEADER: Record<string, string> = {
              hyw: 'Մեր կիրարկած<br>հիմնական ծրագիրներուն<br>մաս կը կազմեն՝',
              en: 'The main programs<br>we implement include:',
            };
            const lang = t?.languages_id ?? 'hyw';
            const heading = COL2_HEADER[lang] ?? COL2_HEADER['en'];
            return (
              <div style={{
                position: 'absolute',
                top: '8%', left: 'calc(60% + 500px)',
                fontWeight: 700, fontSize: 20, color: '#000',
                whiteSpace: 'nowrap',
              }}>
                <span dangerouslySetInnerHTML={{ __html: heading }} />
              </div>
            );
          })()}
          {bullets.map((bullet, i) => {
            const cfg = BUBBLE_CONFIG[i] ?? BUBBLE_CONFIG[i % 5];
            const bgIndex = i + 1;          // 1–5 for row 1, 6–9 for row 2
            const bgExt = bgIndex <= 5 ? 'webp' : 'png';
            const picIndex = (i % 5) + 1;   // always cycles 1–5
            return (
              <div key={i} style={{
                position: 'absolute',
                top: `${cfg.topPct}%`, left: cfg.left,
                width: `${layout.contentBubbleWidth * cfg.scale}px`,
                height: `${layout.contentBubbleHeight * cfg.scale}px`,
                zIndex: 3,
              }}>
                <img
                  src={`/whats_there_${bgIndex}.${bgExt}`}
                  alt=""
                  style={{
                    width: '100%', height: '100%',
                    objectFit: 'fill', display: 'block',
                    transform: cfg.flip ? 'scaleX(-1)' : undefined,
                  }}
                />
                {/* Illustration — row 1 only */}
                {i < 5 && (
                  <img
                    src={`/whats_there_pic_${picIndex}.webp`}
                    alt=""
                    style={{
                      position: 'absolute',
                      top: cfg.picTop, transform: `translateY(-50%)${cfg.flip ? ' scaleX(-1)' : ''}`,
                      [cfg.picOnLeft ? 'left' : 'right']: cfg.picOffset,
                      height: '85%', width: 'auto',
                    }}
                  />
                )}
                {/* Text */}
                <div style={{
                  position: 'absolute',
                  top: cfg.textTop, transform: 'translateY(-50%)',
                  [cfg.picOnLeft ? 'right' : 'left']: cfg.textOffset,
                  width: i < 5 ? '50%' : '80%',
                  textAlign: 'left',
                  fontSize: 18,
                  fontWeight: 400, color: '#000',
                  wordBreak: i < 5 ? 'break-word' : 'normal', whiteSpace: i < 5 ? 'normal' : 'nowrap',
                  lineHeight: 1.3,
                }}>
                  <span dangerouslySetInnerHTML={{ __html: bullet }} />
                </div>
              </div>
            );
          })}
        </div>

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
    </div>
  );
}
