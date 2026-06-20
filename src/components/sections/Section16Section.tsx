import { asset } from '../../lib/asset';

interface Props {
  section: {
    id: number | string;
    main_image: string | null;
    translations: Array<{ Header: string; Content: string; languages_id: string }>;
  };
  directusUrl: string;
  layout: Record<string, number>;
}

export default function Section16Section({ section, directusUrl, layout }: Props) {
  const t = section.translations?.[0];

  return (
    <div style={{
      width: layout.sectionWidth ?? 1920, minWidth: 1280, height: 800, flexShrink: 0,
      position: 'relative', overflow: 'visible',
    }}>
      {section.main_image && (
        <div style={{
          position: 'absolute',
          top: layout.imgTop ?? 420,
          left: layout.imgLeft ?? 960,
          transform: 'translate(-50%, -50%)',
        }}>
          <img
            src={asset(directusUrl, section.main_image)!}
            alt=""
            style={{ height: layout.imgHeight ?? 700, width: 'auto', display: 'block' }}
          />
          {t?.Content && (
            <div
              style={{
                position: 'absolute',
                top: `${layout.textTop ?? 50}%`,
                left: `${layout.textLeft ?? 50}%`,
                transform: 'translate(-50%, -50%)',
                width: `${layout.textWidth ?? 80}%`,
                textAlign: 'left',
                fontSize: layout.fontSize ?? 18,
                lineHeight: 1.5,
                color: '#000',
              }}
              dangerouslySetInnerHTML={{ __html: t.Content }}
            />
          )}
        </div>
      )}
    </div>
  );
}
