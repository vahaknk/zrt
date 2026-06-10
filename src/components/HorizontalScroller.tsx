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
    <div
      style={{
        width: '100vw',
        height: 800,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {section.main_image && (
        <img
          src={fileUrl(directusUrl, section.main_image)}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.3,
          }}
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
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() =>
    typeof window !== 'undefined' && window.innerWidth >= 1600 ? 'large' : 'normal'
  );

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
      el.scrollLeft += e.deltaX + e.deltaY;
      syncLine();
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') el.scrollBy({ left: window.innerWidth, behavior: 'smooth' });
      if (e.key === 'ArrowLeft') el.scrollBy({ left: -window.innerWidth, behavior: 'smooth' });
    };
    window.addEventListener('keydown', onKey);

    // rAF loop keeps the line in sync during smooth scrolls (keyboard, nav menu)
    // where overflow:hidden suppresses the scroll event in Chrome.
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

    const onResize = () => {
      setBreakpoint(window.innerWidth >= 1600 ? 'large' : 'normal');
    };
    window.addEventListener('resize', onResize);

    return () => {
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafId);
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

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
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
    <div
      ref={trackRef}
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        minWidth: 1280,
        minHeight: 800,
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      {/* Sticky logo with nav menu */}
      <div style={{
        position: 'fixed', top: '2%', left: '50%',
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

      <div
        ref={lineRef}
        style={{
          position: 'fixed',
          top: '77%',
          left: 0,
          width: '100vw',
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
  );
}
