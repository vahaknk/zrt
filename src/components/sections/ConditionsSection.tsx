import { useState, useRef, useEffect } from 'react';
import { decodeHtml } from '../../lib/text';
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
  progress?: number;
}


export default function ConditionsSection({ section, tabSections, directusUrl, layout, progress = 1 }: Props) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
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
        </div>
      )}

      {/* Tabbed panel */}
      <div style={{
        position: 'absolute', top: layout.panelTop, left: layout.panelLeft,
        width: layout.panelWidth, zIndex: 5,
        transform: open ? 'translateY(0)' : 'translateY(-40px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'transform 0.35s ease, opacity 0.35s ease',
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
                        fontSize: 18,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        wordBreak: 'break-word',
                        whiteSpace: 'normal',
                        lineHeight: 1.2,
                      }}
                    >
                      {decodeHtml(tabT?.Header ?? `Tab ${i + 1}`)}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div style={{
                flex: 1, overflowY: 'auto',
                fontSize: 18,
                lineHeight: 1.6, color: '#000',
              }}
                dangerouslySetInnerHTML={{ __html: tabSections[activeTab]?.translations?.[0]?.Content ?? '' }}
              />
            </div>
          </div>
        </div>

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
