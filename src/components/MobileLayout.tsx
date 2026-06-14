import { decodeHtml } from '../lib/text';
import RegistrationSection from './sections/RegistrationSection';
import type { SavedLayout } from '../lib/layouts';

const TAB_SECTION_IDS = [9, 10, 11];
const REGISTRATION_SECTION_ID = 7;

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

export default function MobileLayout({ sections, directusUrl, labels }: Props) {
  const visible = sections.filter(s => !TAB_SECTION_IDS.includes(Number(s.id)));

  return (
    <div style={{ minHeight: '100vh', background: '#9683fe', color: '#000', fontFamily: 'inherit', paddingBottom: '2rem' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '2rem 1rem 1.5rem' }}>
        <img src="/zartsants-logo.svg" alt="Zartsants" style={{ height: 72, width: 'auto' }} />
      </div>

      {visible.map(section => {
        const t = section.translations?.[0];
        const id = Number(section.id);

        if (id === REGISTRATION_SECTION_ID) {
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

        return (
          <div key={section.id} style={card}>
            {section.main_image && (
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <img
                  src={`${directusUrl}/assets/${section.main_image}`}
                  alt=""
                  style={{
                    maxHeight: 180,
                    maxWidth: '100%',
                    objectFit: 'contain',
                    display: 'inline-block',
                  }}
                />
              </div>
            )}
            {t?.Header && (
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.35 }}>
                {decodeHtml(t.Header)}
              </h2>
            )}
            {t?.Content && (
              <div
                style={{ fontSize: '0.9rem', lineHeight: 1.75, color: '#111' }}
                dangerouslySetInnerHTML={{ __html: t.Content }}
              />
            )}
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
