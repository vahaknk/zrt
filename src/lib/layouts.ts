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
    normal: { charBottom: 7, charLeft: 666 },
    large:  { charBottom: 7, charLeft: 666 },
  },
  3: {
    normal: { sectionWidth: 100, charBottom: 91, charLeft: 320, contentTop: 8, contentRight: 0, contentWidth: 30 },
    large:  { sectionWidth: 100, charBottom: 91, charLeft: 320, contentTop: 8, contentRight: 0, contentWidth: 30 },
  },
  4: {
    normal: { charBottom: 90, charLeft: 0, bubbleTop: 36, bubbleLeft: 50, contentBubbleTop: -88, contentBubbleLeft: 70 },
    large:  { charBottom: 90, charLeft: 0, bubbleTop: 36, bubbleLeft: 50, contentBubbleTop: -88, contentBubbleLeft: 70 },
  },
  5: {
    normal: { sectionWidth: 100, charBottom: 90, charLeft: 0 },
    large:  { sectionWidth: 100, charBottom: 90, charLeft: 0 },
  },
  6: {
    normal: { sectionWidth: 100, charBottom: 90, charLeft: 650, charWidth: 240, bubbleStartTop: 11, bubbleGap: 12, bubbleHeight: 120, bubbleWidth: 420 },
    large:  { sectionWidth: 100, charBottom: 90, charLeft: 650, charWidth: 240, bubbleStartTop: 11, bubbleGap: 12, bubbleHeight: 120, bubbleWidth: 420 },
  },
  7: {
    normal: { sectionWidth: 100, formTop: 14, formLeft: 28, formWidth: 36, formHeight: 72 },
    large:  { sectionWidth: 100, formTop: 20, formLeft: 28, formWidth: 35, formHeight: 63 },
  },
  12: {
    normal: {
      p1t: 60,  p1l: 80,   p1w: 180,
      p2t: 120, p2l: 700,  p2w: 160,
      p3t: 550, p3l: 200,  p3w: 190,
      p4t: 650, p4l: 900,  p4w: 170,
      p5t: 80,  p5l: 1300, p5w: 175,
    },
    large: {
      p1t: 60,  p1l: 80,   p1w: 180,
      p2t: 120, p2l: 700,  p2w: 160,
      p3t: 550, p3l: 200,  p3w: 190,
      p4t: 650, p4l: 900,  p4w: 170,
      p5t: 80,  p5l: 1300, p5w: 175,
    },
  },
  13: {
    normal: { bubbleTop: 360, bubbleLeft: 480, contentTop: -160, contentLeft: 750, charBottom: 180, charLeft: 700, charWidth: 500 },
    large:  { bubbleTop: 360, bubbleLeft: 480, contentTop: -160, contentLeft: 750, charBottom: 180, charLeft: 700, charWidth: 500 },
  },
  14: {
    normal: { bubbleTop: 360, bubbleLeft: 480, contentTop: -160, contentLeft: 750, charBottom: 130, charLeft: 700, charWidth: 500 },
    large:  { bubbleTop: 360, bubbleLeft: 480, contentTop: -160, contentLeft: 750, charBottom: 130, charLeft: 700, charWidth: 500 },
  },
  15: {
    normal: { bubbleTop: 390, bubbleLeft: 960, panelTop: 220, panelLeft: 1400, panelWidth: 700, charBottom: 150, charLeft: 1150, charWidth: 240 },
    large:  { bubbleTop: 390, bubbleLeft: 960, panelTop: 220, panelLeft: 1400, panelWidth: 700, charBottom: 150, charLeft: 1150, charWidth: 240 },
  },
};

export function getLayout(
  sectionId: number,
  breakpoint: Breakpoint,
  savedLayouts: SavedLayout[]
): Record<string, number> {
  const defaults = LAYOUT_DEFAULTS[sectionId]?.[breakpoint] ?? {};
  const saved = savedLayouts.find(
    l => l.section_id === sectionId && l.breakpoint === breakpoint
  );
  return saved ? { ...defaults, ...saved.config } : { ...defaults };
}
