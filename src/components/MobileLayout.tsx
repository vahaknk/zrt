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

export default function MobileLayout({ sections, directusUrl, labels }: Props) {
  const visible = sections.filter(s => !TAB_SECTION_IDS.includes(Number(s.id)));

  return (
    <div style={{ minHeight: '100vh', background: '#9683fe', color: '#000', fontFamily: 'inherit' }}>

      <div style={{ textAlign: 'center', padding: '2rem 1rem 1.5rem' }}>
        <img src="/zartsants-logo.svg" alt="Zartsants" style={{ height: 72, width: 'auto' }} />
      </div>

      {visible.map(section => {
        const t = section.translations?.[0];
        const id = Number(section.id);

        if (id === REGISTRATION_SECTION_ID) {
          return (
            <div key={section.id} style={{ padding: '1.5rem 1rem' }}>
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
          <div key={section.id} style={{ padding: '1.5rem 1rem', borderBottom: '1px solid rgba(0,0,0,0.12)' }}>
            {section.main_image && (
              <img
                src={`${directusUrl}/assets/${section.main_image}`}
                alt=""
                style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12, marginBottom: '1rem', display: 'block' }}
              />
            )}
            {t?.Header && (
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.3 }}>
                {decodeHtml(t.Header)}
              </h2>
            )}
            {t?.Content && (
              <div
                style={{ fontSize: '0.95rem', lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: t.Content }}
              />
            )}
          </div>
        );
      })}

      <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <img src="/gulbenkian-logo.png" alt="Gulbenkian" style={{ height: 40, width: 'auto' }} />
      </div>
    </div>
  );
}
