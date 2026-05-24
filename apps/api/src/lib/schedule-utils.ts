import { DAY_LABELS } from '@sis/shared';

const DAY_MAP: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

export function formatScheduleSummary(
  meetings: { dayOfWeek: number; startTime: string; endTime: string }[],
): string {
  if (!meetings.length) return '';
  const byDay = new Map<number, string[]>();
  for (const m of meetings) {
    const slot = `${m.startTime}–${m.endTime}`;
    const list = byDay.get(m.dayOfWeek) ?? [];
    list.push(slot);
    byDay.set(m.dayOfWeek, list);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, slots]) => `${DAY_LABELS[day] ?? day} ${slots.join(', ')}`)
    .join('; ');
}

export function parseScheduleText(schedule: string | null | undefined): {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}[] {
  if (!schedule?.trim()) return [];
  const results: { dayOfWeek: number; startTime: string; endTime: string }[] = [];
  const timeRe = /(\d{1,2})(?::(\d{2}))?\s*(?:–|-|to)\s*(\d{1,2})(?::(\d{2}))?/gi;
  const dayTokens = schedule.match(/\b(?:M|Mon|T|Tu|W|Wed|Th|Thu|F|Fri|S|Sat|Sun|MWF|TTH|MTWTF)[a-z]*/gi) ?? [];

  const days: number[] = [];
  for (const token of dayTokens) {
    const upper = token.toUpperCase();
    if (upper === 'MWF') days.push(1, 3, 5);
    else if (upper === 'TTH' || upper === 'TTHU') days.push(2, 4);
    else if (upper === 'MTWTF') days.push(1, 2, 3, 4, 5);
    else {
      const key = token.toLowerCase().replace(/\./g, '');
      if (DAY_MAP[key] !== undefined) days.push(DAY_MAP[key]);
    }
  }

  const timeMatch = timeRe.exec(schedule);
  if (!timeMatch || !days.length) return results;

  const pad = (h: string | undefined, m?: string) =>
    `${(h ?? '0').padStart(2, '0')}:${(m ?? '00').padStart(2, '0')}`;
  const startTime = pad(timeMatch[1], timeMatch[2]);
  const endTime = pad(timeMatch[3], timeMatch[4]);

  for (const dayOfWeek of [...new Set(days)]) {
    results.push({ dayOfWeek, startTime, endTime });
  }
  return results;
}
