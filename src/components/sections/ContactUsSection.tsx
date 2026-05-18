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


export default function ContactUsSection({ section, directusUrl, layout }: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const t = section.translations?.[0];

  return (
    <div style={{
      width: '100vw', height: '100vh', flexShrink: 0,
      position: 'relative', overflow: 'visible',
    }}>

      {/* Main bubble (clickable) */}
      {section.bubble && (
        <div
          onClick={() => setOpen(o => !o)}
          className={open ? '' : 'bubble-hang'}
          style={{
            position: 'absolute', top: layout.bubbleTop, left: layout.bubbleLeft,
            transform: 'translate(-50%, -50%)',
            zIndex: 4, cursor: 'pointer', userSelect: 'none',
            display: 'inline-block',
          }}
        >
          <img
            src={asset(directusUrl, section.bubble)!}
            alt=""
            style={{ height: 200, width: 'auto', display: 'block' }}
          />
          <div style={{
            position: 'absolute', top: '45%', left: '48%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', fontWeight: 700,
            fontSize: '1.5rem', lineHeight: 1.3, color: '#000',
            width: '60%', wordBreak: 'break-word', whiteSpace: 'normal',
            pointerEvents: 'none', paddingRight: '1rem',
          }}>
            {t?.Header ?? ''}
          </div>

          {/* Content bubble */}
          {open && (
            <div style={{
              position: 'absolute', top: layout.contentTop, left: layout.contentLeft,
              zIndex: 3, display: 'inline-block', pointerEvents: 'none',
            }}>
              <img
                src="/contactus_content_bubble.webp"
                alt=""
                style={{ height: 420, width: 'auto', display: 'block' }}
              />
              <div
                style={{
                  position: 'absolute', top: '50%', left: '55%',
                  transform: 'translate(-50%, -50%)',
                  width: '70%', textAlign: 'center',
                  fontSize: '1rem', lineHeight: 1.6,
                  color: '#000', fontWeight: 500,
                  pointerEvents: 'all',
                }}
                className="contact-content"
                dangerouslySetInnerHTML={{ __html: t?.Content ?? '' }}
              />
            </div>
          )}
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
