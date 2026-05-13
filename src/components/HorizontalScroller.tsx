import { useRef, useEffect } from 'react';
import RegistrationSection from './sections/RegistrationSection';
import WhatIsZartsantsSection from './sections/WhatIsZartsantsSection';

const REGISTRATION_SECTION_ID = 7;
const WHAT_IS_SECTION_ID = 2;

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

export default function HorizontalScroller({ sections, directusUrl, labels }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollLeft += e.deltaY + e.deltaX;
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') el.scrollLeft += window.innerWidth;
      if (e.key === 'ArrowLeft') el.scrollLeft -= window.innerWidth;
    };
    window.addEventListener('keydown', onKey);

    return () => {
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

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
        overflowX: 'hidden',
        scrollBehavior: 'smooth',
      }}
    >
      {sections.map((section) => {
        if (Number(section.id) === WHAT_IS_SECTION_ID) {
          return (
            <WhatIsZartsantsSection
              key={section.id}
              section={section}
              directusUrl={directusUrl}
            />
          );
        }
        if (Number(section.id) === REGISTRATION_SECTION_ID) {
          return (
            <RegistrationSection
              key={section.id}
              labels={labels}
              sectionHeader={section.translations?.[0]?.Header ?? ''}
              sectionContent={section.translations?.[0]?.Content ?? ''}
            />
          );
        }
        return <SectionPanel key={section.id} section={section} directusUrl={directusUrl} />;
      })}
    </div>
  );
}