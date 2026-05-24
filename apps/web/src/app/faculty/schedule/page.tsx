'use client';

import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { WeeklyTimetable } from '@/components/weekly-timetable';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { ScheduleEntry } from '@sis/shared';

export default function FacultySchedulePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['faculty', 'schedule'],
    queryFn: () => apiClient<{ schedule: ScheduleEntry[] }>('/faculty/me/schedule'),
  });

  return (
    <RoleGuard role="faculty">
      <div id={ids.faculty.schedule.page} className="space-y-8">
        <PageHeader
          titleId={ids.faculty.schedule.title}
          title="My Schedule"
          description="Weekly timetable for your assigned sections"
        />
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading schedule…</p>
        ) : (
          <WeeklyTimetable id={ids.faculty.schedule.grid} schedule={data?.schedule ?? []} />
        )}
      </div>
    </RoleGuard>
  );
}
