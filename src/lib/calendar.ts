// Pure functions for the member calendar's weekly schedule grid — no Directus
// calls here, so this can be exercised directly (e.g. via `npx tsx`) before
// wiring it into the page.
import { zonedInstant } from './timezone';

export const WEEKDAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type Weekday = (typeof WEEKDAY_ORDER)[number];

export function parseDays(csv: string | null): Weekday[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is Weekday => (WEEKDAY_ORDER as readonly string[]).includes(s));
}

export function timeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// The 7 real dates (Mon-Sun) of the week containing `anchor`.
export function getWeekDates(anchor: Date): Date[] {
  const day = anchor.getDay(); // 0=Sun..6=Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}

function weekdayOf(date: Date): Weekday {
  return WEEKDAY_ORDER[(date.getDay() + 6) % 7];
}

export interface WorkshopInfo {
  id: number;
  name: string;
  days_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
}

export interface CloudInfo {
  id: number;
  name: string;
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
}

export interface SessionBlock {
  label: string;
  date: Date;
  startMin: number;
  endMin: number;
  kind: 'workshop' | 'cloud';
  sourceId: number;
}

export function buildSessionBlocks(
  workshop: WorkshopInfo | null,
  clouds: CloudInfo[],
  weekDates: Date[]
): SessionBlock[] {
  const blocks: SessionBlock[] = [];
  const dateFor = (wd: Weekday) => weekDates.find((d) => weekdayOf(d) === wd) ?? null;

  if (workshop) {
    const startMin = timeToMinutes(workshop.start_time);
    const endMin = timeToMinutes(workshop.end_time);
    if (startMin !== null && endMin !== null) {
      for (const wd of parseDays(workshop.days_of_week)) {
        const date = dateFor(wd);
        if (date) blocks.push({ label: workshop.name, date, startMin, endMin, kind: 'workshop', sourceId: workshop.id });
      }
    }
  }

  for (const cloud of clouds) {
    const startMin = timeToMinutes(cloud.start_time);
    const endMin = timeToMinutes(cloud.end_time);
    const wd = cloud.day_of_week?.trim().toLowerCase() as Weekday | undefined;
    if (wd && startMin !== null && endMin !== null && (WEEKDAY_ORDER as readonly string[]).includes(wd)) {
      const date = dateFor(wd);
      if (date) blocks.push({ label: cloud.name, date, startMin, endMin, kind: 'cloud', sourceId: cloud.id });
    }
  }

  return blocks.sort((a, b) => a.date.getTime() - b.date.getTime() || a.startMin - b.startMin);
}

// The hour range to actually render, from the real session times (with a
// buffer) rather than a hardcoded full-day range, so the grid stays compact.
export function gridBounds(blocks: SessionBlock[]): { startMin: number; endMin: number } {
  const BUFFER = 30;
  const DEFAULT = { startMin: 9 * 60, endMin: 18 * 60 };
  if (blocks.length === 0) return DEFAULT;
  const earliest = Math.min(...blocks.map((b) => b.startMin));
  const latest = Math.max(...blocks.map((b) => b.endMin));
  return {
    startMin: Math.max(0, Math.floor((earliest - BUFFER) / 30) * 30),
    endMin: Math.min(24 * 60, Math.ceil((latest + BUFFER) / 30) * 30),
  };
}

// Real UTC instant for a block's Paris start/end, for client-side local-time conversion.
export function blockInstants(block: SessionBlock): { start: Date; end: Date } {
  return {
    start: zonedInstant('Europe/Paris', block.date, block.startMin),
    end: zonedInstant('Europe/Paris', block.date, block.endMin),
  };
}
