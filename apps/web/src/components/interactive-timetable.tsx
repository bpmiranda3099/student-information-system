'use client';

import { useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import { DAY_LABELS } from '@sis/shared';
import type { AvailableSection } from '@sis/shared';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const GRID_DAYS = [1, 2, 3, 4, 5, 6];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 7);

const COLORS = [
  'bg-blue-100 border-blue-300 text-blue-950',
  'bg-emerald-100 border-emerald-300 text-emerald-950',
  'bg-violet-100 border-violet-300 text-violet-950',
  'bg-amber-100 border-amber-300 text-amber-950',
];

function timeToRow(time: string) {
  const [hRaw, mRaw] = time.split(':').map(Number);
  const h = hRaw ?? 0;
  const m = mRaw ?? 0;
  return (h - 7) * 2 + (m >= 30 ? 1 : 0);
}

function DraggableSection({ section }: { section: AvailableSection }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `available-${section.id}`,
    data: { section },
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={cn(
        'w-full rounded-md border px-2 py-2 text-left text-xs',
        isDragging && 'opacity-50',
      )}
      {...listeners}
      {...attributes}
    >
      <p className="font-medium">{section.subject?.code}</p>
      <p className="text-muted-foreground">{section.sectionCode}</p>
      <p className="text-muted-foreground">{section.seatsLeft} seats</p>
    </button>
  );
}

function TimetableCell({ day, hour }: { day: number; hour: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell-${day}-${hour}` });
  return (
    <div
      ref={setNodeRef}
      className={cn('min-h-6 border-b border-r', isOver && 'bg-accent/30')}
      data-day={day}
      data-hour={hour}
      onDragOver={(e) => e.preventDefault()}
    />
  );
}

export function InteractiveTimetable({
  available,
  selectedIds,
  onSelectedChange,
  conflicts,
}: {
  available: AvailableSection[];
  selectedIds: string[];
  onSelectedChange: (ids: string[]) => void;
  conflicts: string[];
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const selected = available.filter((s) => selectedIds.includes(s.id));
  const unselected = available.filter((s) => !selectedIds.includes(s.id));

  const colorBySection = useMemo(
    () => new Map(selected.map((s, i) => [s.id, COLORS[i % COLORS.length]])),
    [selected],
  );

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const section = event.active.data.current?.section as AvailableSection | undefined;
    if (!section) return;

    if (selectedIds.includes(section.id)) {
      onSelectedChange(selectedIds.filter((id) => id !== section.id));
    } else {
      onSelectedChange([...selectedIds, section.id]);
    }
  }

  return (
    <DndContext
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          <p className="text-sm font-medium">Available sections</p>
          <p className="text-xs text-muted-foreground">Drag to add or remove from schedule</p>
          <div className="max-h-[480px] space-y-2 overflow-y-auto">
            {[...unselected, ...selected].map((s) => (
              <DraggableSection key={s.id} section={s} />
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div
            className="grid min-w-[640px] text-xs"
            style={{ gridTemplateColumns: '48px repeat(6, 1fr)' }}
          >
            <div />
            {GRID_DAYS.map((d) => (
              <div key={d} className="border-b px-1 py-2 text-center font-medium">
                {DAY_LABELS[d]}
              </div>
            ))}
            {HOURS.flatMap((hour) => [
              <div key={`h-${hour}`} className="border-r px-1 py-4 text-muted-foreground">
                {hour}:00
              </div>,
              ...GRID_DAYS.map((day) => (
                <TimetableCell key={`${day}-${hour}`} day={day} hour={hour} />
              )),
            ])}
            {selected.flatMap((entry) =>
              entry.meetings.map((m) => {
                const rowStart = timeToRow(m.startTime) + 2;
                const rowEnd = timeToRow(m.endTime) + 2;
                const col = GRID_DAYS.indexOf(m.dayOfWeek as (typeof GRID_DAYS)[number]) + 2;
                if (col < 2) return null;
                const hasConflict = conflicts.includes(entry.id);
                return (
                  <div
                    key={`${entry.id}-${m.id}`}
                    className={cn(
                      'relative z-10 m-0.5 rounded border px-1 py-0.5 text-[10px] leading-tight',
                      colorBySection.get(entry.id),
                      hasConflict && 'ring-2 ring-destructive',
                    )}
                    style={{
                      gridColumn: col,
                      gridRow: `${rowStart} / ${rowEnd}`,
                    }}
                  >
                    <p className="font-semibold">{entry.subject?.code}</p>
                    <p>{entry.sectionCode}</p>
                    <p>{m.room ?? entry.room}</p>
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>
      <DragOverlay>
        {activeId ? <div className="rounded border bg-background px-3 py-2 text-xs shadow">Moving…</div> : null}
      </DragOverlay>
    </DndContext>
  );
}

function detectClientConflicts(sections: AvailableSection[]): string[] {
  const conflictIds = new Set<string>();
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      const a = sections[i]!;
      const b = sections[j]!;
      for (const ma of a.meetings) {
        for (const mb of b.meetings) {
          if (
            ma.dayOfWeek === mb.dayOfWeek &&
            ma.startTime < mb.endTime &&
            mb.startTime < ma.endTime
          ) {
            conflictIds.add(a.id);
            conflictIds.add(b.id);
          }
        }
      }
    }
  }
  return [...conflictIds];
}

export function useScheduleConflicts(available: AvailableSection[], selectedIds: string[]) {
  return useMemo(() => {
    const selected = available.filter((s) => selectedIds.includes(s.id));
    return detectClientConflicts(selected);
  }, [available, selectedIds]);
}
