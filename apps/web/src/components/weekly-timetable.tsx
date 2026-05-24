'use client';

import { DAY_LABELS } from '@sis/shared';
import type { ScheduleEntry } from '@sis/shared';
import { cn } from '@/lib/utils';

const GRID_DAYS = [1, 2, 3, 4, 5, 6];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 7);

const COLORS = [
  'bg-blue-100 border-blue-300 text-blue-950 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-100',
  'bg-emerald-100 border-emerald-300 text-emerald-950 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-100',
  'bg-violet-100 border-violet-300 text-violet-950 dark:bg-violet-950/50 dark:border-violet-800 dark:text-violet-100',
  'bg-amber-100 border-amber-300 text-amber-950 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-100',
  'bg-rose-100 border-rose-300 text-rose-950 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-100',
];

function timeToRow(time: string) {
  const [hRaw, mRaw] = time.split(':').map(Number);
  const h = hRaw ?? 0;
  const m = mRaw ?? 0;
  return (h - 7) * 2 + (m >= 30 ? 1 : 0);
}

export function WeeklyTimetable({
  schedule,
  id,
}: {
  schedule: ScheduleEntry[];
  id?: string;
}) {
  if (!schedule.length) {
    return (
      <p className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
        No scheduled classes yet.
      </p>
    );
  }

  const colorBySection = new Map(schedule.map((s, i) => [s.sectionId, COLORS[i % COLORS.length]]));

  return (
    <div id={id} className="overflow-x-auto rounded-md border">
      <div className="grid min-w-[640px]" style={{ gridTemplateColumns: '64px repeat(6, 1fr)' }}>
        <div className="border-b bg-muted/40 p-2 text-xs font-medium" />
        {GRID_DAYS.map((d) => (
          <div key={d} className="border-b border-l bg-muted/40 p-2 text-center text-xs font-medium">
            {DAY_LABELS[d]}
          </div>
        ))}
        {HOURS.flatMap((hour) => [
          <div key={`h-${hour}`} className="border-b p-1 text-right text-[10px] text-muted-foreground">
            {hour}:00
          </div>,
          ...GRID_DAYS.map((day) => (
            <div key={`${day}-${hour}`} className="relative min-h-12 border-b border-l">
              {schedule.flatMap((entry) =>
                entry.meetings
                  .filter((m) => m.dayOfWeek === day)
                  .filter((m) => {
                    const startH = Number(m.startTime.split(':')[0]);
                    return startH === hour;
                  })
                  .map((m) => {
                    const startRow = timeToRow(m.startTime);
                    const endRow = timeToRow(m.endTime);
                    const span = Math.max(1, endRow - startRow);
                    return (
                      <div
                        key={`${entry.sectionId}-${m.id}`}
                        className={cn(
                          'absolute inset-x-0.5 rounded border px-1 py-0.5 text-[10px] leading-tight',
                          colorBySection.get(entry.sectionId),
                        )}
                        style={{ top: `${(startRow % 2) * 50}%`, height: `${span * 24}px` }}
                      >
                        <p className="font-semibold">{entry.subjectCode}</p>
                        <p>{entry.sectionCode}</p>
                        <p className="opacity-80">{m.startTime}–{m.endTime}</p>
                      </div>
                    );
                  }),
              )}
            </div>
          )),
        ])}
      </div>
    </div>
  );
}
