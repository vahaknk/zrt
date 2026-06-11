// Returns the CSS transform for a bubble animating in/out from the logo position.
// leftFrac/topFrac are 0–1 fractions of viewport width/height.
export function bubbleEntryTransform(progress: number, leftFrac: number, topFrac: number): string {
  if (typeof window === 'undefined') return 'translate(-50%, -50%)';
  return _calc(progress, leftFrac * window.innerWidth, topFrac * window.innerHeight);
}

// Same but accepts raw pixel positions (for sections that use px layout values).
export function bubbleEntryTransformPx(progress: number, leftPx: number, topPx: number): string {
  if (typeof window === 'undefined') return 'translate(-50%, -50%)';
  return _calc(progress, leftPx, topPx);
}

function _calc(progress: number, bx: number, by: number): string {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const logoX = 0.5 * vw;
  const logoY = 0.02 * vh + 50; // logo at top:2% + half of 100px height
  const t = 1 - progress;
  const dx = (logoX - bx) * t;
  const dy = (logoY - by) * t;
  const scale = 0.15 + 0.85 * progress;
  return `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${scale})`;
}
