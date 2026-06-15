import React, { useState, useEffect, useRef } from 'react';
import { decodeHtml } from '../lib/text';
import RegistrationSection from './sections/RegistrationSection';
import type { SavedLayout } from '../lib/layouts';

const TAB_IDS = [9, 10, 11];
const REGISTRATION_ID = 7;
const WHATS_THERE_ID = 6;
const ABOUT_US_ID = 12;
const CONDITIONS_ID = 15;

interface Translation {
  languages_id: string;
  Header: string;
  Content: string;
}

interface Section {
  id: string;
  order: number;
  main_image: string | null;
  hoover_image: string | null;
  bubble: string | null;
  translations: Translation[];
}

interface Props {
  sections: Section[];
  directusUrl: string;
  labels: Record<string, string>;
  savedLayouts: SavedLayout[];
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.95)',
  borderRadius: 20,
  padding: '1.25rem',
  margin: '0 1rem 1rem',
  boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
};

const contentStyle: React.CSSProperties = {
  fontSize: '0.9rem', lineHeight: 1.8, color: '#111',
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function listToText(html: string): string {
  return html
    .replace(/<ul[^>]*>/gi, '').replace(/<\/ul>/gi, '')
    .replace(/<ol[^>]*>/gi, '').replace(/<\/ol>/gi, '')
    .replace(/<li[^>]*>/gi, '<p style="margin-bottom:0.4rem">').replace(/<\/li>/gi, '</p>')
    .replace(/text-align\s*:\s*center\s*;?/gi, 'text-align: left;');
}

function parseBullets(html: string): string[] {
  const matches = html.match(/<li[^>]*>([\s\S]*?)<\/li>/g) ?? [];
  return matches.map(m => m.replace(/^<li[^>]*>|<\/li>$/g, '').trim()).filter(Boolean);
}

const COL2_HEADER: Record<string, string> = {
  hyw: 'Մեր կիրարկած հիմնական ծրագիրներուն մաս կը կազմեն՝',
  en: 'The main programs we implement include:',
};

function onImgErr(e: React.SyntheticEvent<HTMLImageElement>) {
  (e.target as HTMLImageElement).style.display = 'none';
}

// ─── FadeIn ───────────────────────────────────────────────────────────────────

function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(22px)',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Accordion ────────────────────────────────────────────────────────────────

function Accordion({ header, children }: { header: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        fontFamily: 'inherit', textAlign: 'left',
      }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, flex: 1, lineHeight: 1.35, textAlign: 'left' }}>{header}</span>
        <span style={{
          width: 28, height: 28, borderRadius: '50%',
          background: '#9683fe', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem', fontWeight: 300, flexShrink: 0, marginLeft: '0.75rem',
          transition: 'transform 0.3s ease',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
        }}>+</span>
      </button>
      {/* Smooth height animation via grid trick */}
      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.35s ease' }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ paddingTop: '0.75rem', ...contentStyle }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Section header with accent bar ──────────────────────────────────────────

function SectionHeader({ title, light = false }: { title: string; light?: boolean }) {
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.35, margin: 0, color: light ? '#fff' : '#000' }}>{title}</h2>
      <div style={{ height: 3, width: 32, background: light ? 'rgba(255,255,255,0.6)' : '#9683fe', borderRadius: 2, marginTop: '0.35rem' }} />
    </div>
  );
}

// ─── App icon (WhatsThereSection col1) ───────────────────────────────────────


function AppIcon({ text, index, picSrc }: { text: string; index: number; picSrc: string }) {
  return (
    <FadeIn delay={index * 70} style={{ width: 'calc(33.33% - 0.45rem)', minWidth: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
        <div style={{
          width: '100%', height: 100,
          borderRadius: 18,
          background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        }}>
          <img src={picSrc} alt="" onError={onImgErr}
            style={{ height: '80%', width: 'auto', maxWidth: '80%', objectFit: 'contain', display: 'block' }} />
        </div>
        <div style={{ fontSize: '0.72rem', lineHeight: 1.35, textAlign: 'center', color: '#000' }}
          dangerouslySetInnerHTML={{ __html: text }} />
      </div>
    </FadeIn>
  );
}


// ─── Swipeable text carousel ─────────────────────────────────────────────────

function TextCarousel({ bullets }: { bullets: string[] }) {
  return (
    <div style={{
      display: 'flex',
      overflowX: 'auto',
      scrollSnapType: 'x mandatory',
      gap: '0.75rem',
      paddingBottom: '0.25rem',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
    } as React.CSSProperties}>
      {bullets.map((b, i) => (
        <div key={i} style={{
          flexShrink: 0,
          width: '82%',
          scrollSnapAlign: 'center',
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          padding: '1rem',
          minHeight: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ fontSize: '0.87rem', lineHeight: 1.6, textAlign: 'center' }}
            dangerouslySetInnerHTML={{ __html: b }} />
        </div>
      ))}
    </div>
  );
}

// ─── Main layout ─────────────────────────────────────────────────────────────

export default function MobileLayout({ sections, directusUrl, labels }: Props) {
  const visible = sections.filter(s => !TAB_IDS.includes(Number(s.id)));

  return (
    <div style={{ minHeight: '100vh', background: '#9683fe', color: '#000', fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '2.5rem 1rem 2rem', position: 'relative', overflow: 'hidden' }}>
        <img src="/top-left.webp" alt="" onError={onImgErr}
          style={{ position: 'absolute', top: 0, left: 0, height: 72, opacity: 0.55, pointerEvents: 'none' }} />
        <img src="/top-right.webp" alt="" onError={onImgErr}
          style={{ position: 'absolute', top: 0, right: 0, height: 72, opacity: 0.55, pointerEvents: 'none' }} />
        <img src="/zartsants-logo.svg" alt="Zartsants"
          style={{ height: 72, width: 'auto', position: 'relative', zIndex: 1 }} />
      </div>

      <div style={{ paddingBottom: '2.5rem' }}>
        {visible.map(section => {
          const t = section.translations?.[0];
          const id = Number(section.id);

          // ── Registration ────────────────────────────────────────────────
          if (id === REGISTRATION_ID) {
            return (
              <FadeIn key={section.id}>
                <div style={card}>
                  <RegistrationSection
                    labels={labels}
                    sectionHeader={t?.Header ?? ''}
                    sectionContent={t?.Content ?? ''}
                    mainImage={null}
                    directusUrl={directusUrl}
                    layout={{}}
                    mobileMode
                  />
                </div>
              </FadeIn>
            );
          }

          // ── WhatsThereSection ───────────────────────────────────────────
          if (id === WHATS_THERE_ID) {
            const bullets = parseBullets(t?.Content ?? '');
            const col1 = bullets.slice(0, 5);
            const col2 = bullets.slice(5);
            const lang = t?.languages_id ?? 'hyw';
            const col2Header = COL2_HEADER[lang] ?? COL2_HEADER['en'];
            return (
              <React.Fragment key={section.id}>
                <FadeIn>
                  <div style={{ ...card, paddingBottom: '0.75rem' }}>
                    {t?.Header && <SectionHeader title={decodeHtml(t.Header)} />}
                    <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: '0.65rem', rowGap: '1.2rem', marginTop: '0.25rem' }}>
                      {col1.map((b, i) => (
                        <AppIcon key={i} text={b} index={i} picSrc={`/whats_there_pic_${i + 1}.webp`} />
                      ))}
                    </div>
                  </div>
                </FadeIn>
                {col2.length > 0 && (
                  <FadeIn>
                    <div style={{ ...card, paddingBottom: '1rem' }}>
                      <SectionHeader title={col2Header} />
                        <TextCarousel bullets={col2} />
                    </div>
                  </FadeIn>
                )}
              </React.Fragment>
            );
          }

          // ── About Us — single photo + title + bullet carousel ──────────
          if (id === ABOUT_US_ID) {
            const bullets = parseBullets(t?.Content ?? '');
            return (
              <FadeIn key={section.id}>
                <div style={card}>
                  <img src="/aboug_us_5.webp" alt="" onError={onImgErr}
                    style={{ width: '100%', height: 'auto', objectFit: 'contain', borderRadius: 12, marginBottom: '0.9rem', display: 'block' }} />
                  {t?.Header && <SectionHeader title={decodeHtml(t.Header)} />}
                  {bullets.length > 0
                    ? <TextCarousel bullets={bullets} />
                    : t?.Content && <div style={contentStyle} dangerouslySetInnerHTML={{ __html: listToText(t.Content) }} />
                  }
                </div>
              </FadeIn>
            );
          }

          // ── Section 16 — accordion ──────────────────────────────────────
          if (id === 16) {
            return (
              <FadeIn key={section.id}>
                <div style={card}>
                  <Accordion header={decodeHtml(t?.Header ?? '')}>
                    {t?.Content && (
                      <div dangerouslySetInnerHTML={{ __html: listToText(t.Content) }} />
                    )}
                  </Accordion>
                </div>
              </FadeIn>
            );
          }

          // ── Conditions — purple header + tab accordions ─────────────────
          if (id === CONDITIONS_ID) {
            const tabSections = sections.filter(s => TAB_IDS.includes(Number(s.id)));
            return (
              <FadeIn key={section.id}>
                <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #9683fe 0%, #7060cc 100%)',
                    padding: '1.1rem 1.25rem 0.9rem',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <img src="/conditions_background_image.webp" alt="" onError={onImgErr}
                      style={{ position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)', height: '140%', width: 'auto', opacity: 0.12, pointerEvents: 'none' }} />
                    {t?.Header && <SectionHeader title={decodeHtml(t.Header)} light />}
                    {t?.Content && (
                      <div style={{ ...contentStyle, color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem' }}
                        dangerouslySetInnerHTML={{ __html: listToText(t.Content) }} />
                    )}
                  </div>
                  <div style={{ padding: '0.5rem 1.25rem 0.75rem' }}>
                    {tabSections.map((tab) => {
                      const tabT = tab.translations?.[0];
                      return (
                        <div key={tab.id} style={{ borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '0.6rem', marginTop: '0.6rem' }}>
                          <Accordion header={decodeHtml(tabT?.Header ?? '')}>
                            {tabT?.Content && (
                              <div dangerouslySetInnerHTML={{ __html: listToText(tabT.Content) }} />
                            )}
                          </Accordion>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </FadeIn>
            );
          }

          // ── Default — title → image → content (single column) ─────────
          return (
            <FadeIn key={section.id} delay={30}>
              <div style={card}>
                {t?.Header && <SectionHeader title={decodeHtml(t.Header)} />}
                {section.main_image && (
                  <div style={{ margin: '0.5rem 0 0.75rem' }}>
                    <img src={`${directusUrl}/assets/${section.main_image}`} alt=""
                      style={{ maxHeight: 180, maxWidth: '80%', objectFit: 'contain', display: 'block' }}
                      onError={onImgErr} />
                  </div>
                )}
                {t?.Content && (
                  <div style={contentStyle} dangerouslySetInnerHTML={{ __html: listToText(t.Content) }} />
                )}
              </div>
            </FadeIn>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '1rem 1rem 2rem', position: 'relative' }}>
        <img src="/bottom-left.webp" alt="" onError={onImgErr}
          style={{ position: 'absolute', bottom: 0, left: 0, height: 56, opacity: 0.45, pointerEvents: 'none' }} />
        <img src="/bottom-right.webp" alt="" onError={onImgErr}
          style={{ position: 'absolute', bottom: 0, right: 0, height: 56, opacity: 0.45, pointerEvents: 'none' }} />
        <img src="/gulbenkian-logo.png" alt="Gulbenkian"
          style={{ height: 36, width: 'auto', opacity: 0.85, position: 'relative' }} />
      </div>
    </div>
  );
}
