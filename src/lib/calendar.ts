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

const WEEKDAY_LABEL: Record<Weekday, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

// Days/time as stored in Directus are Paris time — surfaced as-is with a
// label rather than converted, matching how the booking page shows Paris time.
// Used for clouds, which still have exactly one day + one time each.
export function formatScheduleLabel(csv: string | null, startTime: string | null, endTime: string | null): string | null {
  const days = parseDays(csv);
  if (days.length === 0 || !startTime || !endTime) return null;
  const dayLabel = days.map((d) => WEEKDAY_LABEL[d]).join(' & ');
  return `${dayLabel} · ${startTime.slice(0, 5)}–${endTime.slice(0, 5)} (Paris time)`;
}

export interface WorkshopScheduleEntry {
  day: string;
  start_time: string;
  end_time: string;
}

// Workshops can meet on several days with a different time each — group days
// that happen to share the same time into one clause so the common case
// (every day at the same time) still reads as compactly as before.
export function formatWorkshopScheduleLabel(schedule: WorkshopScheduleEntry[] | null): string | null {
  if (!schedule || schedule.length === 0) return null;

  const groups = new Map<string, Weekday[]>();
  for (const entry of schedule) {
    const day = entry.day.trim().toLowerCase();
    if (!(WEEKDAY_ORDER as readonly string[]).includes(day)) continue;
    const key = `${entry.start_time}_${entry.end_time}`;
    const list = groups.get(key) ?? [];
    list.push(day as Weekday);
    groups.set(key, list);
  }
  if (groups.size === 0) return null;

  const clauses = [...groups.entries()].map(([key, days]) => {
    const [start, end] = key.split('_');
    const sorted = [...days].sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b));
    const dayLabel = sorted.map((d) => WEEKDAY_LABEL[d]).join(' & ');
    return `${dayLabel} · ${start.slice(0, 5)}–${end.slice(0, 5)}`;
  });

  return `${clauses.join(', ')} (Paris time)`;
}

// Real UTC instant for a recurring weekly Paris day/time, anchored to the
// nearest occurrence of that weekday from `anchor` — used to let the browser
// convert a schedule blurb (not tied to a specific calendar date) to local
// time. DST-correct since the actual date determines the Paris UTC offset.
export function scheduleEntryInstant(weekday: string, time: string | null, anchor: Date = new Date()): Date | null {
  const wd = weekday.trim().toLowerCase() as Weekday;
  if (!(WEEKDAY_ORDER as readonly string[]).includes(wd)) return null;
  const min = timeToMinutes(time);
  if (min === null) return null;
  const anchorIdx = (anchor.getDay() + 6) % 7; // Monday=0
  const targetIdx = WEEKDAY_ORDER.indexOf(wd);
  const diff = (targetIdx - anchorIdx + 7) % 7;
  const date = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + diff);
  return zonedInstant('Europe/Paris', date, min);
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
  schedule: WorkshopScheduleEntry[] | null;
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
  workshops: WorkshopInfo | (WorkshopInfo | null)[] | null,
  clouds: CloudInfo[],
  weekDates: Date[]
): SessionBlock[] {
  const blocks: SessionBlock[] = [];
  const dateFor = (wd: Weekday) => weekDates.find((d) => weekdayOf(d) === wd) ?? null;

  // Accepts either a single workshop (the old call shape) or a list — a
  // member can now see their own enrolled workshop alongside any they
  // facilitate, so callers may need to pass more than one.
  const workshopList = (Array.isArray(workshops) ? workshops : [workshops]).filter(
    (w): w is WorkshopInfo => w !== null
  );

  for (const workshop of workshopList) {
    for (const entry of workshop.schedule ?? []) {
      if (!entry) continue;
      const startMin = timeToMinutes(entry.start_time);
      const endMin = timeToMinutes(entry.end_time);
      const wd = entry.day?.trim().toLowerCase() as Weekday | undefined;
      if (wd && startMin !== null && endMin !== null && (WEEKDAY_ORDER as readonly string[]).includes(wd)) {
        const date = dateFor(wd);
        if (date) blocks.push({ label: workshop.name, date, startMin, endMin, kind: 'workshop', sourceId: workshop.id });
      }
    }
  }

  for (const cloud of clouds) {
    if (!cloud) continue;
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
