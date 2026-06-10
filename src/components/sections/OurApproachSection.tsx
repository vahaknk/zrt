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


export default function OurApproachSection({ section, directusUrl, layout, progress = 1 }: Props) {
  const [open, setOpen] = useState(false);
  const [bubbleLoaded, setBubbleLoaded] = useState(false);
  const bubbleRef = useRef<HTMLImageElement>(null);
  useEffect(() => { if (bubbleRef.current?.complete) setBubbleLoaded(true); }, []);
  useEffect(() => { if (progress < 0.85) setOpen(false); }, [progress]);
  const t = section.translations?.[0];

  return (
    <div style={{
      width: `${layout.sectionWidth}vw`, minWidth: 1280, height: 800, flexShrink: 0,
      position: 'relative', overflow: 'visible',
    }}>

      {/* Yellow speech bubble (left of center) */}
      {section.bubble && (
        <div
          onClick={() => setOpen(o => !o)}
          className={open ? '' : 'bubble-hang'}
          style={{
            position: 'absolute', top: layout.bubbleTop, left: layout.bubbleLeft,
            transform: 'translate(-50%, -50%)',
            zIndex: 2, display: 'inline-block',
            cursor: 'pointer',
            userSelect: 'none',
          }}>
          <img
            ref={bubbleRef}
            src={asset(directusUrl, section.bubble)!}
            alt=""
            onLoad={() => setBubbleLoaded(true)}
            style={{ height: layout.bubbleHeight, width: 'auto', display: 'block', transform: 'scaleX(-1) rotate(-20deg)' }}
          />
          <div style={{
            position: 'absolute', top: '50%', left: '60%',
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

      {/* Right column: bird + text */}
      <div style={{
        position: 'absolute', top: `${layout.contentTop}%`, right: `${layout.contentRight}%`,
        width: `${layout.contentWidth}%`, zIndex: 2,
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
        transform: open ? 'translateY(0)' : 'translateY(-40px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'transform 0.35s ease, opacity 0.35s ease',
      }}>
        {section.hoover_image && (
          <img
            src={asset(directusUrl, section.hoover_image)!}
            alt=""
            style={{ height: 80, width: 'auto' }}
          />
        )}
        <div
          style={{ fontSize: '1.2rem', lineHeight: 1.5, color: '#ffffff' }}
          dangerouslySetInnerHTML={{ __html: t?.Content ?? '' }}
        />
      </div>

      
    </div>
  );
}
