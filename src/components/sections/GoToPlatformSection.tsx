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
  labels: Record<string, string>;
  layout: Record<string, number>;
  onNavigateToRegistration: () => void;
  progress?: number;
}


export default function GoToPlatformSection({ section, directusUrl, labels, layout, onNavigateToRegistration, progress = 1 }: Props) {
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

  return (
    <div style={{
      width: 1020, minWidth: 1020, height: 800, flexShrink: 0,
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
            style={{ height: 200, width: 'auto', display: 'block' }}
          />
          <div style={{
            position: 'absolute', top: '48%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', fontWeight: 700,
            fontSize: 'calc(26px * var(--font-scale, 1))', lineHeight: 1.3, color: '#000',
            width: '60%', wordBreak: 'break-word', whiteSpace: 'normal',
            pointerEvents: 'none', paddingRight: '1rem',
            opacity: bubbleLoaded ? 1 : 0,
          }}>
            {decodeHtml(t?.Header ?? '')}
          </div>

          {/* Content bubble */}
          <div style={{
            position: 'absolute', top: layout.contentTop, left: layout.contentLeft,
            zIndex: 3, display: 'inline-block',
            transform: open ? 'translateY(0)' : 'translateY(-40px)',
            opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
            transition: 'transform 0.35s ease, opacity 0.35s ease',
          }}>
              <img
                src="/contactus_content_bubble.webp"
                alt=""
                style={{ height: 420, width: 'auto', display: 'block' }}
              />
              <div
                style={{
                  position: 'absolute', top: '40%', left: '55%',
                  transform: 'translate(-50%, -50%)',
                  width: '70%', textAlign: 'center',
                  fontSize: 'calc(20px * var(--font-scale, 1))', lineHeight: 1.6,
                  color: '#000', fontWeight: 400,
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
                  fontWeight: 500, fontSize: 'calc(20px * var(--font-scale, 1))',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#333')}
                onMouseLeave={e => (e.currentTarget.style.background = '#000')}
              >
                {labels['interested_button'] ?? ''}
              </button>
            </div>
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
            position: 'absolute', bottom: layout.charBottom, left: layout.charLeft,
            width: `${layout.charWidth}px`, height: 'auto', display: 'block',
            zIndex: 5,
          }}
        />
      )}
    </div>
  );
}
