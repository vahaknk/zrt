import { useState } from 'react';
import { decodeHtml } from '../../lib/text';
import { fileUrl } from '../../lib/asset';

interface Props {
  section: {
    id: number | string;
    main_image: string | null;
    translations: Array<{ Header: string; Content: string; languages_id: string }>;
  };
  directusUrl: string;
  layout: Record<string, number>;
}

function parseBullets(html: string): string[] {
  const matches = html.match(/<li[^>]*>([\s\S]*?)<\/li>/g) ?? [];
  return matches.map(m => decodeHtml(m.replace(/<[^>]+>/g, '').trim())).filter(Boolean);
}

export default function AboutUsSection({ section, directusUrl, layout }: Props) {
  const [index, setIndex] = useState(0);
  const t = section.translations?.[0];
  const bullets = parseBullets(t?.Content ?? '');

  const scatteredImages = [
    { src: '/aboug_us_1.webp', top: layout.p1t, left: layout.p1l, width: layout.p1w },
    { src: '/aboug_us_2.webp', top: layout.p2t, left: layout.p2l, width: layout.p2w },
    { src: '/aboug_us_3.webp', top: layout.p3t, left: layout.p3l, width: layout.p3w },
    { src: '/aboug_us_4.webp', top: layout.p4t, left: layout.p4l, width: layout.p4w },
    { src: '/aboug_us_5.webp', top: layout.p5t, left: layout.p5l, width: layout.p5w },
  ];

  return (
    <div style={{
      width: 1920, minWidth: 1280, height: 800, flexShrink: 0,
      position: 'relative', overflow: 'visible',
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
    }}>
      {scatteredImages.map((img, i) => (
        <img
          key={i}
          src={img.src}
          alt=""
          style={{
            position: 'absolute',
            top: img.top, left: img.left,
            width: img.width, height: 'auto',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />
      ))}
      {section.main_image && (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            src={fileUrl(directusUrl, section.main_image)}
            alt=""
            style={{ height: 400, width: 'auto', display: 'block' }}
          />
          <div style={{
            position: 'absolute', top: '20%', left: '10%',
            width: '80%', height: '60%',
            display: 'flex', flexDirection: 'row',
            alignItems: 'center', gap: '0.6rem',
          }}>
            {t?.Header && (
              <h2 style={{
                fontSize: 33, fontWeight: 700,
                color: '#000', flexShrink: 0, width: '15%',
                lineHeight: 1.3, wordBreak: 'break-word',
              }}>
                {decodeHtml(t.Header)}
              </h2>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flex: 1 }}>
              <button
                onClick={() => setIndex(i => Math.max(0, i - 1))}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '2.2rem', flexShrink: 0, color: '#000',
                  opacity: index > 0 ? 1 : 0.2,
                }}
              >⬅</button>
              <span style={{
                flex: 1, textAlign: 'center',
                fontSize: 25,
                lineHeight: 1.4, color: '#000', fontWeight: 400,
                wordBreak: 'break-word', whiteSpace: 'normal',
                overflowWrap: 'break-word',
              }}>
                {bullets[index]}
              </span>
              <button
                onClick={() => setIndex(i => Math.min(bullets.length - 1, i + 1))}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '2.2rem', flexShrink: 0, color: '#000',
                  opacity: index < bullets.length - 1 ? 1 : 0.2,
                }}
              >⮕</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
