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
    normal: { charBottom: 7, charLeft: 666, charWidth: 2536, bubbleTop: 288, bubbleLeft: 640, bubbleHeight: 358 },
    large:  { charBottom: 7, charLeft: 666, charWidth: 3168, bubbleTop: 288, bubbleLeft: 640, bubbleHeight: 358 },
  },
  3: {
    normal: { sectionWidth: 1920, charBottom: 91, charLeft: 320, charWidth: 2536, contentTop: 64, contentRight: 0, contentWidth: 793, bubbleTop: 288, bubbleLeft: 614, bubbleHeight: 358 },
    large:  { sectionWidth: 1920, charBottom: 91, charLeft: 320, charWidth: 3168, contentTop: 64, contentRight: 0, contentWidth: 793, bubbleTop: 288, bubbleLeft: 614, bubbleHeight: 358 },
  },
  4: {
    normal: { charBottom: 90, charLeft: 0, charWidth: 2536, bubbleTop: 288, bubbleLeft: 640, bubbleHeight: 275, contentBubbleTop: -88, contentBubbleLeft: 70 },
    large:  { charBottom: 90, charLeft: 0, charWidth: 3168, bubbleTop: 288, bubbleLeft: 640, bubbleHeight: 275, contentBubbleTop: -88, contentBubbleLeft: 70 },
  },
  5: {
    normal: { sectionWidth: 1920, charBottom: 90, charLeft: 0, charWidth: 2536, bubbleTop: 280, bubbleLeft: 320, bubbleHeight: 275 },
    large:  { sectionWidth: 1920, charBottom: 90, charLeft: 0, charWidth: 3168, bubbleTop: 280, bubbleLeft: 320, bubbleHeight: 275 },
  },
  6: {
    normal: { sectionWidth: 1920, charBottom: 90, charLeft: 650, charWidth: 475, bubbleTop: 368, bubbleLeft: 870, bubbleHeight: 275, bubbleStartTop: 11, bubbleGap: 12, contentBubbleHeight: 165, contentBubbleWidth: 578 },
    large:  { sectionWidth: 1920, charBottom: 90, charLeft: 650, charWidth: 475, bubbleTop: 368, bubbleLeft: 870, bubbleHeight: 275, bubbleStartTop: 11, bubbleGap: 12, contentBubbleHeight: 165, contentBubbleWidth: 578 },
  },
  7: {
    normal: { sectionWidth: 1920, imgTop: 75, imgLeft: 960, imgHeight: 894, formTop: 14, formLeft: 28, formWidth: 36, formHeight: 72 },
    large:  { sectionWidth: 1920, imgTop: 75, imgLeft: 960, imgHeight: 894, formTop: 20, formLeft: 28, formWidth: 35, formHeight: 63 },
  },
  12: {
    normal: {
      p1t: 60,  p1l: 80,   p1w: 248,
      p2t: 120, p2l: 700,  p2w: 220,
      p3t: 550, p3l: 200,  p3w: 261,
      p4t: 650, p4l: 900,  p4w: 234,
      p5t: 80,  p5l: 1300, p5w: 241,
    },
    large: {
      p1t: 60,  p1l: 80,   p1w: 248,
      p2t: 120, p2l: 700,  p2w: 220,
      p3t: 550, p3l: 200,  p3w: 261,
      p4t: 650, p4l: 900,  p4w: 234,
      p5t: 80,  p5l: 1300, p5w: 241,
    },
  },
  13: {
    normal: { bubbleTop: 360, bubbleLeft: 480, bubbleHeight: 275, contentTop: -160, contentLeft: 750, contentHeight: 578, charBottom: 180, charLeft: 700, charWidth: 1080 },
    large:  { bubbleTop: 360, bubbleLeft: 480, bubbleHeight: 275, contentTop: -160, contentLeft: 750, contentHeight: 578, charBottom: 180, charLeft: 700, charWidth: 1080 },
  },
  14: {
    normal: { bubbleTop: 360, bubbleLeft: 480, contentTop: -160, contentLeft: 750, charBottom: 130, charLeft: 700, charWidth: 1170 },
    large:  { bubbleTop: 360, bubbleLeft: 480, contentTop: -160, contentLeft: 750, charBottom: 130, charLeft: 700, charWidth: 1170 },
  },
  15: {
    normal: { bubbleTop: 390, bubbleLeft: 960, panelTop: 220, panelLeft: 1400, panelWidth: 963, charBottom: 150, charLeft: 1150, charWidth: 475 },
    large:  { bubbleTop: 390, bubbleLeft: 960, panelTop: 220, panelLeft: 1400, panelWidth: 963, charBottom: 150, charLeft: 1150, charWidth: 475 },
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
