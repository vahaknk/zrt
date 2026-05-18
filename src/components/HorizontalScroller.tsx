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
        height: '100vh',
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
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() =>
    typeof window !== 'undefined' && window.innerWidth >= 1440 ? 'large' : 'normal'
  );

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const DAMPING = 0.4; // lower = slower scroll feel

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (Math.abs(e.deltaY) > 40 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        // Mouse wheel click — jump one section so mandatory snap can advance.
        el.scrollBy({ left: e.deltaY > 0 ? window.innerWidth : -window.innerWidth, behavior: 'smooth' });
      } else {
        // Trackpad (horizontal swipe or vertical redirect) — apply damping
        // so speed is controllable instead of using full OS momentum.
        const delta = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        el.scrollLeft += delta * DAMPING;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') el.scrollBy({ left: window.innerWidth, behavior: 'smooth' });
      if (e.key === 'ArrowLeft') el.scrollBy({ left: -window.innerWidth, behavior: 'smooth' });
    };
    window.addEventListener('keydown', onKey);

    const onScroll = () => {
      if (lineRef.current) {
        lineRef.current.style.backgroundPositionX = `${-el.scrollLeft}px`;
      }
    };
    el.addEventListener('scroll', onScroll);

    const onResize = () => {
      setBreakpoint(window.innerWidth >= 1440 ? 'large' : 'normal');
    };
    window.addEventListener('resize', onResize);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
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

  function getSectionContent(section: Section) {
    const id = Number(section.id);
    if (id === WHAT_IS_SECTION_ID) {
      return <WhatIsZartsantsSection section={section} directusUrl={directusUrl} layout={layout(id)} />;
    }
    if (id === SECTION3_ID) {
      return <OurApproachSection section={section} directusUrl={directusUrl} layout={layout(id)} />;
    }
    if (id === SECTION4_ID) {
      return <ForWhomSection section={section} directusUrl={directusUrl} layout={layout(id)} />;
    }
    if (id === SECTION5_ID) {
      return <WhatHappensSection section={section} directusUrl={directusUrl} layout={layout(id)} />;
    }
    if (id === SECTION6_ID) {
      return <WhatsThereSection section={section} directusUrl={directusUrl} layout={layout(id)} />;
    }
    if (id === SECTION12_ID) {
      return <AboutUsSection section={section} directusUrl={directusUrl} layout={layout(id)} />;
    }
    if (id === SECTION13_ID) {
      return <ContactUsSection section={section} directusUrl={directusUrl} layout={layout(id)} />;
    }
    if (id === SECTION14_ID) {
      return <GoToPlatformSection section={section} directusUrl={directusUrl} layout={layout(id)} onNavigateToRegistration={() => scrollToSection('7')} />;
    }
    if (TAB_SECTION_IDS.includes(id)) return null;
    if (id === SECTION15_ID) {
      const tabSections = sections.filter(s => TAB_SECTION_IDS.includes(Number(s.id)));
      return <ConditionsSection section={section} tabSections={tabSections} directusUrl={directusUrl} layout={layout(id)} />;
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
        overflowX: 'scroll',
        overflowY: 'hidden',
        scrollSnapType: 'x mandatory',
        position: 'relative',
        // Hide scrollbar across browsers
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      } as React.CSSProperties}
    >
      {/* Sticky logo with nav menu */}
      <div style={{
        position: 'fixed', top: '2%', left: '2%',
        zIndex: 10, textAlign: 'left',
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
            position: 'absolute', top: 'calc(100% + 8px)', left: 0,
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
        }}
      />

      {sections.map((section) => {
        const content = getSectionContent(section);
        if (content === null) return null;
        return (
          <div key={section.id} id={`section-${section.id}`} style={{ display: 'flex', flexShrink: 0, scrollSnapAlign: 'start' }}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
