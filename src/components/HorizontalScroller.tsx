import { useRef, useEffect, useState } from 'react';
import RegistrationSection from './sections/RegistrationSection';
import WhatIsZartsantsSection from './sections/WhatIsZartsantsSection';
import OurApproachSection from './sections/OurApproachSection';
import ForWhomSection from './sections/ForWhomSection';
import WhatHappensSection from './sections/WhatHappensSection';
import WhatsThereSection from './sections/WhatsThereSection';
import AboutUsSection from './sections/AboutUsSection';
import ConditionsSection from './sections/ConditionsSection';
import ContactUsSection from './sections/ContactUsSection';
import GoToPlatformSection from './sections/GoToPlatformSection';
import { getLayout, type Breakpoint, type SavedLayout } from '../lib/layouts';

const REGISTRATION_SECTION_ID = 7;
const WHAT_IS_SECTION_ID = 2;
const SECTION3_ID = 3;
const SECTION4_ID = 4;
const SECTION5_ID = 5;
const SECTION6_ID = 6;
const SECTION12_ID = 12;
const SECTION13_ID = 13;
const SECTION14_ID = 14;
const SECTION15_ID = 15;
const TAB_SECTION_IDS = [9, 10, 11];

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

function fileUrl(directusUrl: string, id: string) {
  return `${directusUrl}/assets/${id}`;
}

function SectionPanel({ section, directusUrl }: { section: Section; directusUrl: string }) {
  const t = section.translations?.[0];
  return (
    <div style={{
      width: 1920, height: 800, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '4rem', position: 'relative', overflow: 'hidden',
    }}>
      {section.main_image && (
        <img
          src={fileUrl(directusUrl, section.main_image)}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1.5rem', lineHeight: 1.2 }}>
          {t?.Header ?? ''}
        </h2>
        <div
          style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#000' }}
          dangerouslySetInnerHTML={{ __html: t?.Content ?? '' }}
        />
      </div>
    </div>
  );
}


export default function HorizontalScroller({ sections, directusUrl, labels, savedLayouts }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollLeft, setScrollLeft] = useState(0);
  const sectionOffsetsRef = useRef<Record<string, number>>({});
  const breakpoint: Breakpoint = 'large'; // responsive temporarily disabled

  // Scale the 1920px design canvas to fit the physical viewport.
  // Using React state + transform:scale avoids all CSS zoom / vw-unit
  // cross-browser inconsistencies (Chrome and Firefox don't update vw
  // when zoom is applied to <html>, but Safari does).
  const [scale, setScale] = useState(() => Math.min(1, window.innerWidth / 1920));
  const [screenH, setScreenH] = useState(() => window.innerHeight);
  useEffect(() => {
    const update = () => {
      setScale(Math.min(1, window.innerWidth / 1920));
      setScreenH(window.innerHeight);
    };
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  // Height of the inner 1920px canvas in CSS px, so it fills the screen after scaling
  const innerH = screenH / scale;

  useEffect(() => {
    const computeOffsets = () => {
      const offsets: Record<string, number> = {};
      sections.forEach(s => {
        if (TAB_SECTION_IDS.includes(Number(s.id))) return;
        const el = document.getElementById(`section-${s.id}`);
        if (el) offsets[s.id] = el.offsetLeft;
      });
      sectionOffsetsRef.current = offsets;
    };
    computeOffsets();
    window.addEventListener('resize', computeOffsets);
    return () => window.removeEventListener('resize', computeOffsets);
  }, [sections]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const syncLine = () => {
      if (lineRef.current) {
        lineRef.current.style.backgroundPositionX = `${-el.scrollLeft * 0.6}px`;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Divide by scale so physical trackpad/wheel delta maps correctly
      // to the CSS px coordinate space of the scaled inner canvas.
      const s = Math.min(1, window.innerWidth / 1920);
      el.scrollLeft += (e.deltaX !== 0 ? e.deltaX : e.deltaY * 2) / s;
      syncLine();
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') el.scrollBy({ left: 1920, behavior: 'smooth' });
      if (e.key === 'ArrowLeft') el.scrollBy({ left: -1920, behavior: 'smooth' });
    };
    window.addEventListener('keydown', onKey);

    let rafId: number;
    let lastScroll = el.scrollLeft;
    const rafLoop = () => {
      const s = el.scrollLeft;
      if (s !== lastScroll) {
        lastScroll = s;
        syncLine();
        setScrollLeft(s);
      }
      rafId = requestAnimationFrame(rafLoop);
    };
    rafId = requestAnimationFrame(rafLoop);

    const layoutChannel = new BroadcastChannel('layout-update');
    layoutChannel.onmessage = () => window.location.reload();

    return () => {
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(rafId);
      layoutChannel.close();
    };
  }, []);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(`section-${sectionId}`);
    if (el && trackRef.current) {
      const target = (el.firstElementChild as HTMLElement)?.offsetLeft ?? el.offsetLeft;
      trackRef.current.scrollTo({ left: target, behavior: 'smooth' });
    }
    setMenuOpen(false);
  };

  const navSections = sections.filter(s => !TAB_SECTION_IDS.includes(Number(s.id)));

  function layout(sectionId: number) {
    return getLayout(sectionId, breakpoint, savedLayouts);
  }

  const vw = 1920;
  const progresses: Record<string, number> = {};
  sections.forEach(s => {
    if (TAB_SECTION_IDS.includes(Number(s.id))) return;
    const offset = sectionOffsetsRef.current[s.id] ?? 0;
    progresses[s.id] = Math.max(0, Math.min(1, 1 - Math.abs(scrollLeft - offset) / vw));
  });

  function getSectionContent(section: Section, progress: number) {
    const id = Number(section.id);
    if (id === WHAT_IS_SECTION_ID) {
      return <WhatIsZartsantsSection section={section} directusUrl={directusUrl} layout={layout(id)} progress={progress} />;
    }
    if (id === SECTION3_ID) {
      return <OurApproachSection section={section} directusUrl={directusUrl} layout={layout(id)} progress={progress} />;
    }
    if (id === SECTION4_ID) {
      return <ForWhomSection section={section} directusUrl={directusUrl} layout={layout(id)} progress={progress} />;
    }
    if (id === SECTION5_ID) {
      return <WhatHappensSection section={section} directusUrl={directusUrl} layout={layout(id)} progress={progress} />;
    }
    if (id === SECTION6_ID) {
      return <WhatsThereSection section={section} directusUrl={directusUrl} layout={layout(id)} progress={progress} />;
    }
    if (id === SECTION12_ID) {
      return <AboutUsSection section={section} directusUrl={directusUrl} layout={layout(id)} />;
    }
    if (id === SECTION13_ID) {
      return <ContactUsSection section={section} directusUrl={directusUrl} layout={layout(id)} progress={progress} />;
    }
    if (id === SECTION14_ID) {
      return <GoToPlatformSection section={section} directusUrl={directusUrl} layout={layout(id)} progress={progress} onNavigateToRegistration={() => scrollToSection('7')} />;
    }
    if (TAB_SECTION_IDS.includes(id)) return null;
    if (id === SECTION15_ID) {
      const tabSections = sections.filter(s => TAB_SECTION_IDS.includes(Number(s.id)));
      return <ConditionsSection section={section} tabSections={tabSections} directusUrl={directusUrl} layout={layout(id)} progress={progress} />;
    }
    if (id === REGISTRATION_SECTION_ID) {
      return (
        <RegistrationSection
          labels={labels}
          sectionHeader={section.translations?.[0]?.Header ?? ''}
          sectionContent={section.translations?.[0]?.Content ?? ''}
          mainImage={section.main_image}
          directusUrl={directusUrl}
          layout={layout(id)}
        />
      );
    }
    return <SectionPanel section={section} directusUrl={directusUrl} />;
  }

  if (sections.length === 0) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
        No sections found.
      </div>
    );
  }

  return (
    // Outer: clips to the physical viewport — no CSS zoom dependency
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Inner: 1920px design canvas scaled to fill the viewport */}
      <div style={{
        width: 1920,
        height: innerH,
        transform: scale < 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
        position: 'relative',
      }}>

        {/* Logo with nav menu — absolute inside scaled canvas */}
        <div style={{
          position: 'absolute', top: '2%', left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000, textAlign: 'center',
        }}>
          <div
            onClick={() => setMenuOpen(o => !o)}
            className={menuOpen ? '' : 'logo-hang'}
            style={{ cursor: 'pointer', userSelect: 'none', display: 'inline-block' }}
          >
            <img src="/zartsants-logo.svg" alt="Zartsants" style={{ height: 100 }} />
          </div>

          {menuOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.95)',
              borderRadius: 12, padding: '0.5rem',
              boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
              minWidth: 220,
            }}>
              {navSections.map((s) => {
                const label = s.translations?.[0]?.Header ?? `Section ${s.id}`;
                return (
                  <div
                    key={s.id}
                    onClick={() => scrollToSection(s.id)}
                    style={{
                      padding: '0.5rem 0.9rem',
                      cursor: 'pointer',
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      color: '#000',
                      whiteSpace: 'nowrap',
                      textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f0ecff')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ground line — absolute inside scaled canvas */}
        <div
          ref={lineRef}
          style={{
            position: 'absolute',
            top: 'calc(50% + 285px)',
            left: 0,
            width: 1920,
            height: 80,
            transform: 'translateY(-50%)',
            backgroundImage: 'url(/line.png)',
            backgroundRepeat: 'repeat-x',
            backgroundPositionX: '0px',
            backgroundPositionY: 'center',
            backgroundSize: 'auto 100%',
            pointerEvents: 'none',
            zIndex: 0,
            willChange: 'background-position',
          }}
        />

        {/* Scrollable track — fills the scaled canvas, overflow hidden clips horizontally */}
        <div
          ref={trackRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            width: 1920,
            height: '100%',
            minHeight: 800,
            overflow: 'hidden',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {sections.map((section) => {
            const content = getSectionContent(section, progresses[section.id] ?? 0);
            if (content === null) return null;
            return (
              <div key={section.id} id={`section-${section.id}`} style={{ display: 'flex', flexShrink: 0 }}>
                {content}
              </div>
            );
          })}
          <div style={{ flexShrink: 0, width: 640, height: 800 }} />
        </div>

      </div>
    </div>
  );
}
