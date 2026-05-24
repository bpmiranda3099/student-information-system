'use client';

import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { WeeklyTimetable } from '@/components/weekly-timetable';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { ScheduleEntry } from '@sis/shared';

export default function StudentSchedulePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['student', 'schedule'],
    queryFn: () => apiClient<{ schedule: ScheduleEntry[] }>('/students/me/schedule'),
  });

  return (
    <RoleGuard role="student">
      <div id={ids.student.schedule.page} className="space-y-8">
        <PageHeader
          titleId={ids.student.schedule.title}
          title="My Schedule"
          description="Weekly timetable for your enrolled sections"
        />
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading schedule…</p>
        ) : (
          <WeeklyTimetable id={ids.student.schedule.grid} schedule={data?.schedule ?? []} />
        )}
      </div>
    </RoleGuard>
  );
}
