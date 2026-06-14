import React, { useState } from 'react';
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

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.92)',
  borderRadius: 20,
  padding: '1.25rem',
  margin: '0 1rem 1rem',
  boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
};

const h2Style: React.CSSProperties = {
  fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', lineHeight: 1.35,
};

const h3Style: React.CSSProperties = {
  fontSize: '1rem', fontWeight: 700, marginBottom: '0.4rem', lineHeight: 1.3,
};

const contentStyle: React.CSSProperties = {
  fontSize: '0.9rem', lineHeight: 1.75, color: '#111',
};

// Convert <ul>/<ol> list markup to plain <p> blocks
function listToText(html: string): string {
  return html
    .replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ul>/gi, '')
    .replace(/<ol[^>]*>/gi, '')
    .replace(/<\/ol>/gi, '')
    .replace(/<li[^>]*>/gi, '<p style="margin-bottom:0.35rem">')
    .replace(/<\/li>/gi, '</p>');
}

function parseBullets(html: string): string[] {
  const matches = html.match(/<li[^>]*>([\s\S]*?)<\/li>/g) ?? [];
  return matches.map(m => m.replace(/^<li[^>]*>|<\/li>$/g, '').trim()).filter(Boolean);
}

const COL2_HEADER: Record<string, string> = {
  hyw: 'Մեր կիրարկած հիմնական ծրագիրներուն մաս կը կազմեն՝',
  en: 'The main programs we implement include:',
};

function Accordion({ header, children }: { header: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <span style={{ ...h2Style, marginBottom: 0, flex: 1 }}>{header}</span>
        <span style={{ fontSize: '1.4rem', fontWeight: 300, marginLeft: '0.75rem', lineHeight: 1 }}>
          {open ? '−' : '+'}
        </span>
      </button>
      {open && <div style={{ marginTop: '0.75rem' }}>{children}</div>}
    </div>
  );
}

export default function MobileLayout({ sections, directusUrl, labels }: Props) {
  const visible = sections.filter(s => !TAB_IDS.includes(Number(s.id)));

  return (
    <div style={{ minHeight: '100vh', background: '#9683fe', color: '#000', fontFamily: 'inherit', paddingBottom: '2rem' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '2rem 1rem 1.5rem' }}>
        <img src="/zartsants-logo.svg" alt="Zartsants" style={{ height: 72, width: 'auto' }} />
      </div>

      {visible.map(section => {
        const t = section.translations?.[0];
        const id = Number(section.id);

        // Registration — full form, no image
        if (id === REGISTRATION_ID) {
          return (
            <div key={section.id} style={card}>
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
          );
        }

        // WhatsThereSection — two separate cards
        if (id === WHATS_THERE_ID) {
          const bullets = parseBullets(t?.Content ?? '');
          const col1 = bullets.slice(0, 5);
          const col2 = bullets.slice(5);
          const lang = t?.languages_id ?? 'hyw';
          const col2Header = COL2_HEADER[lang] ?? COL2_HEADER['en'];

          return (
            <React.Fragment key={section.id}>
              <div style={card}>
                {section.main_image && (
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <img
                      src={`${directusUrl}/assets/${section.main_image}`}
                      alt=""
                      style={{ maxHeight: 180, maxWidth: '100%', objectFit: 'contain', display: 'inline-block' }}
                    />
                  </div>
                )}
                {t?.Header && <h2 style={h2Style}>{decodeHtml(t.Header)}</h2>}
                {col1.map((b, i) => (
                  <div key={i} style={{ ...contentStyle, marginBottom: '0.5rem' }} dangerouslySetInnerHTML={{ __html: b }} />
                ))}
              </div>
              {col2.length > 0 && (
                <div style={card}>
                  <h2 style={h2Style}>{col2Header}</h2>
                  {col2.map((b, i) => (
                    <div key={i} style={{ ...contentStyle, marginBottom: '0.5rem' }} dangerouslySetInnerHTML={{ __html: b }} />
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        }

        // About Us — no image, accordion
        if (id === ABOUT_US_ID) {
          return (
            <div key={section.id} style={card}>
              <Accordion header={decodeHtml(t?.Header ?? '')}>
                {t?.Content && (
                  <div style={contentStyle} dangerouslySetInnerHTML={{ __html: listToText(t.Content) }} />
                )}
              </Accordion>
            </div>
          );
        }

        // Conditions — include tab section content below
        if (id === CONDITIONS_ID) {
          const tabSections = sections.filter(s => TAB_IDS.includes(Number(s.id)));
          return (
            <div key={section.id} style={card}>
              {t?.Header && <h2 style={h2Style}>{decodeHtml(t.Header)}</h2>}
              {t?.Content && (
                <div style={contentStyle} dangerouslySetInnerHTML={{ __html: listToText(t.Content) }} />
              )}
              {tabSections.map(tab => {
                const tabT = tab.translations?.[0];
                return (
                  <div key={tab.id} style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(0,0,0,0.12)' }}>
                    {tabT?.Header && <h3 style={h3Style}>{decodeHtml(tabT.Header)}</h3>}
                    {tabT?.Content && (
                      <div style={contentStyle} dangerouslySetInnerHTML={{ __html: listToText(tabT.Content) }} />
                    )}
                  </div>
                );
              })}
            </div>
          );
        }

        // Default — image (contain) + accordion
        return (
          <div key={section.id} style={card}>
            {section.main_image && (
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <img
                  src={`${directusUrl}/assets/${section.main_image}`}
                  alt=""
                  style={{ maxHeight: 180, maxWidth: '100%', objectFit: 'contain', display: 'inline-block' }}
                />
              </div>
            )}
            <Accordion header={decodeHtml(t?.Header ?? '')}>
              {t?.Content && (
                <div style={contentStyle} dangerouslySetInnerHTML={{ __html: listToText(t.Content) }} />
              )}
            </Accordion>
          </div>
        );
      })}

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '1.5rem 1rem 0' }}>
        <img src="/gulbenkian-logo.png" alt="Gulbenkian" style={{ height: 36, width: 'auto', opacity: 0.85 }} />
      </div>
    </div>
  );
}
