export type Breakpoint = 'normal' | 'large';

export interface SavedLayout {
  id?: number;
  section_id: number;
  breakpoint: Breakpoint;
  config: Record<string, number>;
}

// Default layout values for each section × breakpoint.
// "normal" targets 13" MacBook Air (~1280 CSS px).
// "large"  targets 24"+ monitor  (~1920 CSS px).
export const LAYOUT_DEFAULTS: Record<number, Record<Breakpoint, Record<string, number>>> = {
  2: {
    normal: { charBottom: 7, charLeft: 666, charWidth: 1536, bubbleTop: 288, bubbleLeft: 640, bubbleHeight: 312 },
    large:  { charBottom: 7, charLeft: 666, charWidth: 1920, bubbleTop: 288, bubbleLeft: 640, bubbleHeight: 312 },
  },
  3: {
    normal: { sectionWidth: 1920, charBottom: 91, charLeft: 320, charWidth: 1536, contentTop: 64, contentRight: 0, contentWidth: 691, bubbleTop: 288, bubbleLeft: 614, bubbleHeight: 312 },
    large:  { sectionWidth: 1920, charBottom: 91, charLeft: 320, charWidth: 1920, contentTop: 64, contentRight: 0, contentWidth: 691, bubbleTop: 288, bubbleLeft: 614, bubbleHeight: 312 },
  },
  4: {
    normal: { charBottom: 90, charLeft: 0, charWidth: 1536, bubbleTop: 288, bubbleLeft: 640, bubbleHeight: 240, contentBubbleTop: -88, contentBubbleLeft: 70 },
    large:  { charBottom: 90, charLeft: 0, charWidth: 1920, bubbleTop: 288, bubbleLeft: 640, bubbleHeight: 240, contentBubbleTop: -88, contentBubbleLeft: 70 },
  },
  5: {
    normal: { sectionWidth: 1920, charBottom: 90, charLeft: 0, charWidth: 1536, bubbleTop: 280, bubbleLeft: 320, bubbleHeight: 240 },
    large:  { sectionWidth: 1920, charBottom: 90, charLeft: 0, charWidth: 1920, bubbleTop: 280, bubbleLeft: 320, bubbleHeight: 240 },
  },
  6: {
    normal: { sectionWidth: 1920, charBottom: 90, charLeft: 650, charWidth: 288, bubbleTop: 368, bubbleLeft: 870, bubbleHeight: 240, bubbleStartTop: 11, bubbleGap: 12, contentBubbleHeight: 144, contentBubbleWidth: 504 },
    large:  { sectionWidth: 1920, charBottom: 90, charLeft: 650, charWidth: 288, bubbleTop: 368, bubbleLeft: 870, bubbleHeight: 240, bubbleStartTop: 11, bubbleGap: 12, contentBubbleHeight: 144, contentBubbleWidth: 504 },
  },
  7: {
    normal: { sectionWidth: 1920, imgTop: 75, imgLeft: 960, imgHeight: 780, formTop: 14, formLeft: 28, formWidth: 36, formHeight: 72 },
    large:  { sectionWidth: 1920, imgTop: 75, imgLeft: 960, imgHeight: 780, formTop: 20, formLeft: 28, formWidth: 35, formHeight: 63 },
  },
  12: {
    normal: {
      p1t: 60,  p1l: 80,   p1w: 216,
      p2t: 120, p2l: 700,  p2w: 192,
      p3t: 550, p3l: 200,  p3w: 228,
      p4t: 650, p4l: 900,  p4w: 204,
      p5t: 80,  p5l: 1300, p5w: 210,
    },
    large: {
      p1t: 60,  p1l: 80,   p1w: 216,
      p2t: 120, p2l: 700,  p2w: 192,
      p3t: 550, p3l: 200,  p3w: 228,
      p4t: 650, p4l: 900,  p4w: 204,
      p5t: 80,  p5l: 1300, p5w: 210,
    },
  },
  13: {
    normal: { bubbleTop: 360, bubbleLeft: 480, bubbleHeight: 240, contentTop: -160, contentLeft: 750, contentHeight: 504, charBottom: 180, charLeft: 700, charWidth: 600 },
    large:  { bubbleTop: 360, bubbleLeft: 480, bubbleHeight: 240, contentTop: -160, contentLeft: 750, contentHeight: 504, charBottom: 180, charLeft: 700, charWidth: 600 },
  },
  14: {
    normal: { bubbleTop: 360, bubbleLeft: 480, contentTop: -160, contentLeft: 750, charBottom: 130, charLeft: 700, charWidth: 600 },
    large:  { bubbleTop: 360, bubbleLeft: 480, contentTop: -160, contentLeft: 750, charBottom: 130, charLeft: 700, charWidth: 600 },
  },
  15: {
    normal: { bubbleTop: 390, bubbleLeft: 960, panelTop: 220, panelLeft: 1400, panelWidth: 840, charBottom: 150, charLeft: 1150, charWidth: 288 },
    large:  { bubbleTop: 390, bubbleLeft: 960, panelTop: 220, panelLeft: 1400, panelWidth: 840, charBottom: 150, charLeft: 1150, charWidth: 288 },
  },
};

// Keys that represent physical sizes (images, bubbles, panels) — scaled ×1.2.
// Position/ratio keys (Top, Left, Bottom, Right, Width%, Height%) are NOT scaled.
const SIZE_KEYS = new Set([
  'charWidth', 'bubbleHeight', 'imgHeight',
  'contentBubbleWidth', 'contentBubbleHeight',
  'panelWidth', 'contentWidth', 'contentHeight',
  'p1w', 'p2w', 'p3w', 'p4w', 'p5w',
  'fontSize',
]);
const SIZE_SCALE = 1.2;

export function getLayout(
  sectionId: number,
  breakpoint: Breakpoint,
  savedLayouts: SavedLayout[]
): Record<string, number> {
  const defaults = LAYOUT_DEFAULTS[sectionId]?.[breakpoint] ?? {};
  const saved = savedLayouts.find(
    l => l.section_id === sectionId && l.breakpoint === breakpoint
  );
  const base = saved ? { ...defaults, ...saved.config } : { ...defaults };
  return Object.fromEntries(
    Object.entries(base).map(([k, v]) =>
      [k, SIZE_KEYS.has(k) ? Math.round(v * SIZE_SCALE) : v]
    )
  );
}
