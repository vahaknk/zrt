import { useState } from 'react';
import { fileUrl } from '../../lib/asset';

interface Props {
  section: {
    id: number | string;
    main_image: string | null;
    translations: Array<{ Header: string; Content: string; languages_id: string }>;
  };
  directusUrl: string;
}

function parseBullets(html: string): string[] {
  const matches = html.match(/<li[^>]*>([\s\S]*?)<\/li>/g) ?? [];
  return matches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
}

export default function AboutUsSection({ section, directusUrl }: Props) {
  const [index, setIndex] = useState(0);
  const t = section.translations?.[0];
  const bullets = parseBullets(t?.Content ?? '');

  const scatteredImages = [
    { src: '/aboug_us_1.webp', top: 60,  left: 80,   width: 180, rotate: 0  },
    { src: '/aboug_us_2.webp', top: 120, left: 700,  width: 160, rotate: 0   },
    { src: '/aboug_us_3.webp', top: 550, left: 200,  width: 190, rotate: 0  },
    { src: '/aboug_us_4.webp', top: 650, left: 900,  width: 170, rotate: 0   },
    { src: '/aboug_us_5.webp', top: 80,  left: 1300, width: 175, rotate: 0  },
  ];

  return (
    <div style={{
      width: '100vw', height: '100vh', flexShrink: 0,
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
            transform: `rotate(${img.rotate}deg)`,
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
            style={{ height: 'clamp(120px, 30vh, 240px)', width: 'auto', display: 'block' }}
          />
          <div style={{
            position: 'absolute', top: '20%', left: '10%',
            width: '80%', height: '60%',
            display: 'flex', flexDirection: 'row',
            alignItems: 'center', gap: '0.6rem',
          }}>
            {t?.Header && (
              <h2 style={{
                fontSize: 'clamp(1.6rem, 1.2vh, 1rem)', fontWeight: 700,
                color: '#000', flexShrink: 0, width: '30%',
                lineHeight: 1.3, wordBreak: 'break-word',
              }}>
                {t.Header}
              </h2>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flex: 1 }}>
              <button
                onClick={() => setIndex(i => Math.max(0, i - 1))}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '1.4rem', flexShrink: 0, color: '#000',
                  opacity: index > 0 ? 1 : 0.2,
                }}
              >‹</button>
              <span style={{
                flex: 1, textAlign: 'center',
                fontSize: 'clamp(1.0rem, 1.2vh, 0.85rem)',
                lineHeight: 1.4, color: '#000', fontWeight: 500,
                wordBreak: 'break-word', whiteSpace: 'normal',
                overflowWrap: 'break-word',
              }}>
                {bullets[index]}
              </span>
              <button
                onClick={() => setIndex(i => Math.min(bullets.length - 1, i + 1))}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '1.2rem', flexShrink: 0, color: '#000',
                  opacity: index < bullets.length - 1 ? 1 : 0.2,
                }}
              >›</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}