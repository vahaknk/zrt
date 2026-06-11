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


export default function ForWhomSection({ section, directusUrl, layout, progress = 1 }: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [bubbleLoaded, setBubbleLoaded] = useState(false);
  const bubbleRef = useRef<HTMLImageElement>(null);
  useEffect(() => { if (bubbleRef.current?.complete) setBubbleLoaded(true); }, []);
  useEffect(() => { if (progress < 0.5) setOpen(false); }, [progress]);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  useEffect(() => {
    if (progress > 0.3) setBubbleVisible(true);
  }, [progress]);
  const t = section.translations?.[0];

  return (
    <div style={{
      width: 1920, minWidth: 1280, height: 800, flexShrink: 0,
      position: 'relative', overflow: 'visible',
    }}>

      {/* Main bubble (clickable) */}
      {section.bubble && (
        <div
          onClick={() => setOpen(o => !o)}
          className={open ? '' : 'bubble-hang'}
          style={{
            position: 'absolute', top: layout.bubbleTop, left: layout.bubbleLeft,
            transform: bubbleVisible ? 'translate(-50%, -50%)' : 'translate(-50%, calc(-50% - 60px))',
            opacity: bubbleVisible ? 1 : 0,
            transition: 'transform 0.6s ease, opacity 0.4s ease',
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
            position: 'absolute', top: '45%', left: '48%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', fontWeight: 700,
            fontSize: 22, lineHeight: 1.3, color: '#000',
            width: '60%', wordBreak: 'break-word', whiteSpace: 'normal',
            pointerEvents: 'none', paddingRight: '1rem',
            opacity: bubbleLoaded ? 1 : 0,
          }}>
            {decodeHtml(t?.Header ?? '')}
          </div>

          {/* Content bubble */}
          <div style={{
            position: 'absolute', top: `${layout.contentBubbleTop}%`, left: `${layout.contentBubbleLeft}%`,
            zIndex: 3, display: 'inline-block', pointerEvents: 'none',
            transform: open ? 'translateY(0)' : 'translateY(-40px)',
            opacity: open ? 1 : 0,
            transition: 'transform 0.35s ease, opacity 0.35s ease',
          }}>
              <img
                src="/for_whom_click_bubble.webp"
                alt=""
                style={{ height: 420, width: 'auto', display: 'block' }}
              />
              <div
                style={{
                  position: 'absolute', top: '43%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '75%', textAlign: 'center',
                  fontSize: 18, lineHeight: 1.3,
                  color: '#000', fontWeight: 400, pointerEvents: 'none',
                }}
                dangerouslySetInnerHTML={{ __html: t?.Content ?? '' }}
              />
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
