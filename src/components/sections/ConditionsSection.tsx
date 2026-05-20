import { useState, useRef, useEffect } from 'react';
import { asset } from '../../lib/asset';

interface SectionData {
  id: number | string;
  main_image: string | null;
  hoover_image: string | null;
  bubble: string | null;
  translations: Array<{ Header: string; Content: string; languages_id: string }>;
}

interface Props {
  section: SectionData;
  tabSections: SectionData[];
  directusUrl: string;
  layout: Record<string, number>;
}


export default function ConditionsSection({ section, tabSections, directusUrl, layout }: Props) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [bubbleLoaded, setBubbleLoaded] = useState(false);
  const bubbleRef = useRef<HTMLImageElement>(null);
  useEffect(() => { if (bubbleRef.current?.complete) setBubbleLoaded(true); }, []);
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
            ref={bubbleRef}
            src={asset(directusUrl, section.bubble)!}
            alt=""
            onLoad={() => setBubbleLoaded(true)}
            style={{ height: 'clamp(100px, 28vh, 200px)', width: 'auto', display: 'block' }}
          />
          <div style={{
            position: 'absolute', top: '45%', left: '48%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', fontWeight: 700,
            fontSize: 'clamp(1rem, 2.8vh, 2rem)', lineHeight: 1.3, color: '#000',
            width: '60%', wordBreak: 'break-word', whiteSpace: 'normal',
            pointerEvents: 'none', paddingRight: '1rem',
            opacity: bubbleLoaded ? 1 : 0,
          }}>
            {t?.Header ?? ''}
          </div>
        </div>
      )}

      {/* Tabbed panel */}
      {open && (
        <div style={{
          position: 'absolute', top: layout.panelTop, left: layout.panelLeft,
          width: layout.panelWidth,
          zIndex: 5,
        }}>
          <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
            <img
              src="/conditions_background_image.webp"
              alt=""
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', flexDirection: 'column', padding: '8% 10% 10%',
            }}>
              {/* Tab buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {tabSections.map((tab, i) => {
                  const tabT = tab.translations?.[0];
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveTab(i)}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.3rem',
                        background: activeTab === i ? '#00691e' : 'rgba(255,255,255,0.6)',
                        color: activeTab === i ? '#fff' : '#00691e',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 'clamp(0.7rem, 1.4vh, 1rem)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        wordBreak: 'break-word',
                        whiteSpace: 'normal',
                        lineHeight: 1.2,
                      }}
                    >
                      {tabT?.Header ?? `Tab ${i + 1}`}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div style={{
                flex: 1, overflowY: 'auto',
                fontSize: 'clamp(0.75rem, 1.5vh, 1rem)',
                lineHeight: 1.6, color: '#000',
              }}
                dangerouslySetInnerHTML={{ __html: tabSections[activeTab]?.translations?.[0]?.Content ?? '' }}
              />
            </div>
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
            width: `${layout.charWidth}px`, height: 'auto', display: 'block',
            zIndex: 2,
          }}
        />
      )}
    </div>
  );
}
