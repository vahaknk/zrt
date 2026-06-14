import { useState, useEffect } from 'react';
import HorizontalScroller from './HorizontalScroller';
import MobileLayout from './MobileLayout';
import type { SavedLayout } from '../lib/layouts';

const MOBILE_BREAKPOINT = 900;

interface Props {
  sections: any[];
  directusUrl: string;
  labels: Record<string, string>;
  savedLayouts: SavedLayout[];
}

export default function AppShell(props: Props) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile
    ? <MobileLayout {...props} />
    : <HorizontalScroller {...props} />;
}
