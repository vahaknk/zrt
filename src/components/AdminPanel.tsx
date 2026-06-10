import { useState } from 'react';
import { LAYOUT_DEFAULTS, type SavedLayout } from '../lib/layouts';

interface Props {
  pw: string;
  savedLayouts: SavedLayout[];
}

interface FieldDef {
  key: string;
  label: string;
  unit: string;
}

interface SectionDef {
  id: number;
  name: string;
  fields: FieldDef[];
}

const SECTION_DEFS: SectionDef[] = [
  {
    id: 2, name: 'WhatIsZartsants',
    fields: [
      { key: 'bubbleTop',    label: 'Bubble Top',    unit: 'px' },
      { key: 'bubbleLeft',   label: 'Bubble Left',   unit: 'px' },
      { key: 'bubbleHeight', label: 'Bubble Height', unit: 'px' },
      { key: 'charBottom',   label: 'Char Bottom',   unit: 'px' },
      { key: 'charLeft',     label: 'Char Left',     unit: 'px' },
      { key: 'charWidth',    label: 'Char Width',    unit: 'px' },
    ],
  },
  {
    id: 3, name: 'OurApproach',
    fields: [
      { key: 'sectionWidth',  label: 'Section Width',        unit: 'vw' },
      { key: 'bubbleTop',     label: 'Bubble Top',           unit: 'px' },
      { key: 'bubbleLeft',    label: 'Bubble Left',          unit: 'px' },
      { key: 'bubbleHeight',  label: 'Bubble Height',        unit: 'px' },
      { key: 'charBottom',    label: 'Char Bottom',          unit: 'px' },
      { key: 'charLeft',      label: 'Char Left',            unit: 'px' },
      { key: 'contentTop',    label: 'Content Column Top',   unit: '%'  },
      { key: 'contentRight',  label: 'Content Column Right', unit: '%'  },
      { key: 'contentWidth',  label: 'Content Column Width', unit: '%'  },
    ],
  },
  {
    id: 4, name: 'ForWhom',
    fields: [
      { key: 'bubbleTop',         label: 'Bubble Top',          unit: 'px' },
      { key: 'bubbleLeft',        label: 'Bubble Left',         unit: 'px' },
      { key: 'bubbleHeight',      label: 'Bubble Height',       unit: 'px' },
      { key: 'charBottom',        label: 'Char Bottom',         unit: 'px' },
      { key: 'charLeft',          label: 'Char Left',           unit: 'px' },
      { key: 'charWidth',         label: 'Char Width',          unit: 'px' },
      { key: 'contentBubbleTop',  label: 'Content Bubble Top',  unit: '%'  },
      { key: 'contentBubbleLeft', label: 'Content Bubble Left', unit: '%'  },
    ],
  },
  {
    id: 5, name: 'WhatHappens',
    fields: [
      { key: 'sectionWidth', label: 'Section Width', unit: 'vw' },
      { key: 'bubbleTop',    label: 'Bubble Top',    unit: 'px' },
      { key: 'bubbleLeft',   label: 'Bubble Left',   unit: 'px' },
      { key: 'bubbleHeight', label: 'Bubble Height', unit: 'px' },
      { key: 'charBottom',   label: 'Char Bottom',   unit: 'px' },
      { key: 'charLeft',     label: 'Char Left',     unit: 'px' },
      { key: 'charWidth',    label: 'Char Width',    unit: 'px' },
    ],
  },
  {
    id: 6, name: 'WhatsThere',
    fields: [
      { key: 'sectionWidth',        label: 'Section Width',              unit: 'vw' },
      { key: 'bubbleTop',           label: 'Bubble Top',                 unit: 'px' },
      { key: 'bubbleLeft',          label: 'Bubble Left',                unit: 'px' },
      { key: 'bubbleHeight',        label: 'Bubble Height',              unit: 'px' },
      { key: 'charBottom',          label: 'Char Bottom',                unit: 'px' },
      { key: 'charLeft',            label: 'Char Left',                  unit: 'px' },
      { key: 'charWidth',           label: 'Char Width',                 unit: 'px' },
      { key: 'bubbleStartTop',      label: 'Content Bubbles Start Top',  unit: '%'  },
      { key: 'bubbleGap',           label: 'Content Bubbles Gap',        unit: '%'  },
      { key: 'contentBubbleHeight', label: 'Content Bubble Height',      unit: 'px' },
      { key: 'contentBubbleWidth',  label: 'Content Bubble Width',       unit: 'px' },
    ],
  },
  {
    id: 7, name: 'Registration',
    fields: [
      { key: 'sectionWidth', label: 'Section Width', unit: 'vw' },
      { key: 'formTop',      label: 'Form Top',      unit: '%'  },
      { key: 'formLeft',     label: 'Form Left',     unit: '%'  },
      { key: 'formWidth',    label: 'Form Width',    unit: '%'  },
      { key: 'formHeight',   label: 'Form Height',   unit: '%'  },
    ],
  },
  {
    id: 12, name: 'AboutUs (Photos)',
    fields: [
      { key: 'p1t', label: 'Photo 1 Top',   unit: 'px' }, { key: 'p1l', label: 'Photo 1 Left',  unit: 'px' }, { key: 'p1w', label: 'Photo 1 Width', unit: 'px' },
      { key: 'p2t', label: 'Photo 2 Top',   unit: 'px' }, { key: 'p2l', label: 'Photo 2 Left',  unit: 'px' }, { key: 'p2w', label: 'Photo 2 Width', unit: 'px' },
      { key: 'p3t', label: 'Photo 3 Top',   unit: 'px' }, { key: 'p3l', label: 'Photo 3 Left',  unit: 'px' }, { key: 'p3w', label: 'Photo 3 Width', unit: 'px' },
      { key: 'p4t', label: 'Photo 4 Top',   unit: 'px' }, { key: 'p4l', label: 'Photo 4 Left',  unit: 'px' }, { key: 'p4w', label: 'Photo 4 Width', unit: 'px' },
      { key: 'p5t', label: 'Photo 5 Top',   unit: 'px' }, { key: 'p5l', label: 'Photo 5 Left',  unit: 'px' }, { key: 'p5w', label: 'Photo 5 Width', unit: 'px' },
    ],
  },
  {
    id: 13, name: 'ContactUs',
    fields: [
      { key: 'bubbleTop',   label: 'Bubble Top',   unit: 'px' },
      { key: 'bubbleLeft',  label: 'Bubble Left',  unit: 'px' },
      { key: 'contentTop',  label: 'Content Top',  unit: 'px' },
      { key: 'contentLeft', label: 'Content Left', unit: 'px' },
      { key: 'charBottom',  label: 'Char Bottom',  unit: 'px' },
      { key: 'charLeft',    label: 'Char Left',    unit: 'px' },
      { key: 'charWidth',   label: 'Char Width',   unit: 'px' },
    ],
  },
  {
    id: 14, name: 'GoToPlatform',
    fields: [
      { key: 'bubbleTop',   label: 'Bubble Top',   unit: 'px' },
      { key: 'bubbleLeft',  label: 'Bubble Left',  unit: 'px' },
      { key: 'contentTop',  label: 'Content Top',  unit: 'px' },
      { key: 'contentLeft', label: 'Content Left', unit: 'px' },
      { key: 'charBottom',  label: 'Char Bottom',  unit: 'px' },
      { key: 'charLeft',    label: 'Char Left',    unit: 'px' },
      { key: 'charWidth',   label: 'Char Width',   unit: 'px' },
    ],
  },
  {
    id: 15, name: 'Conditions',
    fields: [
      { key: 'bubbleTop',  label: 'Bubble Top',  unit: 'px' },
      { key: 'bubbleLeft', label: 'Bubble Left', unit: 'px' },
      { key: 'panelTop',   label: 'Panel Top',   unit: 'px' },
      { key: 'panelLeft',  label: 'Panel Left',  unit: 'px' },
      { key: 'panelWidth', label: 'Panel Width', unit: 'px' },
      { key: 'charBottom', label: 'Char Bottom', unit: 'px' },
      { key: 'charLeft',   label: 'Char Left',   unit: 'px' },
      { key: 'charWidth',  label: 'Char Width',  unit: 'px' },
    ],
  },
];

function initValues(savedLayouts: SavedLayout[]): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const sec of SECTION_DEFS) {
    const defaults = LAYOUT_DEFAULTS[sec.id]?.['normal'] ?? {};
    const saved = savedLayouts.find(l => l.section_id === sec.id && l.breakpoint === 'normal');
    const merged = saved ? { ...defaults, ...saved.config } : { ...defaults };
    out[sec.id] = {};
    for (const f of sec.fields) {
      out[sec.id][f.key] = String(merged[f.key] ?? 0);
    }
  }
  return out;
}

const cellStyle: React.CSSProperties = {
  padding: '0.3rem 0.5rem',
  borderBottom: '1px solid #eee',
};

const inputStyle: React.CSSProperties = {
  width: 90,
  padding: '0.3rem 0.4rem',
  border: '1px solid #ccc',
  borderRadius: 6,
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  textAlign: 'right',
};

export default function AdminPanel({ pw, savedLayouts }: Props) {
  const [values, setValues] = useState(() => initValues(savedLayouts));
  const [saving, setSaving] = useState<string>('');
  const [msg, setMsg] = useState<Record<string, string>>({});

  const update = (sectionId: number, key: string, val: string) => {
    setValues(v => ({
      ...v,
      [sectionId]: { ...v[sectionId], [key]: val },
    }));
  };

  const save = async (sectionId: number) => {
    const key = String(sectionId);
    setSaving(key);
    const raw = values[sectionId];
    const config: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) config[k] = Number(v);

    try {
      // Save to both breakpoints so layout stays in sync
      const results = await Promise.all(['normal', 'large'].map(bp =>
        fetch('/api/save-layout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pw, section_id: sectionId, breakpoint: bp, config }),
        })
      ));
      setMsg(m => ({ ...m, [key]: results.every(r => r.ok) ? '✓ Saved' : '✗ Error' }));
    } catch {
      setMsg(m => ({ ...m, [key]: '✗ Error' }));
    }
    setSaving('');
    setTimeout(() => setMsg(m => { const n = { ...m }; delete n[key]; return n; }), 2500);
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>Layout Admin</h1>
      <p style={{ color: '#666', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Edit element positions. Changes apply after page reload.
      </p>

      {SECTION_DEFS.map(sec => (
        <div key={sec.id} style={{
          background: '#fff', borderRadius: 12,
          boxShadow: '0 1px 8px rgba(0,0,0,0.08)',
          marginBottom: '1.5rem', overflow: 'hidden',
        }}>
          <div style={{
            background: '#1a1a1a', color: '#fff',
            padding: '0.75rem 1.2rem',
          }}>
            <span style={{ fontWeight: 700 }}>Section {sec.id} — {sec.name}</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#f8f8f8' }}>
                <th style={{ ...cellStyle, textAlign: 'left', fontWeight: 600, width: '60%' }}>Field</th>
                <th style={{ ...cellStyle, textAlign: 'center', fontWeight: 600 }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {sec.fields.map(f => (
                <tr key={f.key}>
                  <td style={{ ...cellStyle, color: '#555' }}>
                    {f.label} <span style={{ color: '#aaa', fontSize: '0.8rem' }}>({f.unit})</span>
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>
                    <input
                      type="number"
                      style={inputStyle}
                      value={values[sec.id]?.[f.key] ?? ''}
                      onChange={e => update(sec.id, f.key, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{
            padding: '0.75rem 1.2rem',
            display: 'flex', gap: '0.75rem', alignItems: 'center',
            borderTop: '1px solid #eee',
          }}>
            <button
              onClick={() => save(sec.id)}
              disabled={saving === String(sec.id)}
              style={{
                padding: '0.4rem 1.1rem',
                background: saving === String(sec.id) ? '#888' : '#000',
                color: '#fff', border: 'none', borderRadius: 999,
                fontWeight: 700, fontSize: '0.85rem',
                cursor: saving === String(sec.id) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {saving === String(sec.id) ? 'Saving…' : 'Save'}
            </button>
            {msg[String(sec.id)] && (
              <span style={{ fontSize: '0.85rem', color: msg[String(sec.id)].startsWith('✓') ? '#00691e' : '#c00' }}>
                {msg[String(sec.id)]}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
