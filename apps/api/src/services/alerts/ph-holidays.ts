import { prisma } from '../../lib/prisma.js';
import type { NormalizedAlert } from './normalizer.js';
import { upsertExternalAlerts, logFetch } from './normalizer.js';

export async function syncPhHolidaysToCalendar(year: number) {
  const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/PH`);
  if (!res.ok) throw new Error(`Holiday API failed: ${res.status}`);
  const holidays = (await res.json()) as {
    date: string;
    localName: string;
    name: string;
  }[];

  let count = 0;
  for (const h of holidays) {
    const externalId = `ph-${year}-${h.date}`;
    await prisma.academicCalendarEvent.upsert({
      where: {
        source_externalId: { source: 'official_ph', externalId },
      },
      create: {
        title: h.localName || h.name,
        description: h.name,
        startDate: new Date(`${h.date}T00:00:00.000Z`),
        endDate: new Date(`${h.date}T00:00:00.000Z`),
        type: 'holiday',
        source: 'official_ph',
        externalId,
        allDay: true,
      },
      update: {
        title: h.localName || h.name,
        description: h.name,
        startDate: new Date(`${h.date}T00:00:00.000Z`),
        endDate: new Date(`${h.date}T00:00:00.000Z`),
      },
    });
    count++;
  }
  return count;
}

export async function fetchPhHolidays(year = new Date().getFullYear()): Promise<NormalizedAlert[]> {
  const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/PH`);
  if (!res.ok) throw new Error(`Holiday API failed: ${res.status}`);
  const holidays = (await res.json()) as {
    date: string;
    localName: string;
    name: string;
  }[];

  return holidays.map((h) => ({
    provider: 'ph_holidays' as const,
    externalId: `ph-${year}-${h.date}`,
    title: h.localName || h.name,
    summary: `Official PH holiday: ${h.name} (${h.date})`,
    category: 'holiday' as const,
    severity: 'low' as const,
    issuedAt: new Date(`${h.date}T00:00:00.000Z`),
    rawPayload: h,
  }));
}

export async function runPhHolidaysFetch() {
  try {
    const year = new Date().getFullYear();
    const alerts = await fetchPhHolidays(year);
    const count = await upsertExternalAlerts(alerts);
    await syncPhHolidaysToCalendar(year);
    await logFetch('ph_holidays', 'ok', count);
    return count;
  } catch (err) {
    await logFetch('ph_holidays', 'error', 0, err instanceof Error ? err.message : 'Unknown');
    throw err;
  }
}
