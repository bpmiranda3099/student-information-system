'use client';

import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';

export default function StudentAttendancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['student', 'attendance'],
    queryFn: () =>
      apiClient<{
        attendance: {
          sectionName: string;
          totalSessions: number;
          presentCount: number;
          attendanceRate: number;
        }[];
      }>('/students/me/attendance'),
  });

  const rows = data?.attendance ?? [];
  const avgRate = rows.length
    ? Math.round(rows.reduce((a, b) => a + b.attendanceRate, 0) / rows.length)
    : null;

  return (
    <RoleGuard role="student">
      <div id={ids.student.attendance.page} className="space-y-8">
        <PageHeader
          titleId={ids.student.attendance.title}
          title="Attendance"
          description="Your attendance summary by section"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Sections tracked" value={rows.length} isLoading={isLoading} />
          <StatCard label="Average rate" value={avgRate !== null ? `${avgRate}%` : '—'} isLoading={isLoading} />
          <StatCard
            label="Total sessions"
            value={rows.reduce((a, b) => a + b.totalSessions, 0)}
            isLoading={isLoading}
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading attendance…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            id={ids.student.attendance.empty}
            title="No attendance records yet"
            description="Attendance will appear after faculty marks sessions."
          />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Summary by section</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  id={ids.student.attendance.list}
                  rows={rows}
                  rowKey={(r) => r.sectionName}
                  columns={[
                    { key: 'section', header: 'Section', cell: (r) => r.sectionName },
                    { key: 'present', header: 'Present', cell: (r) => r.presentCount },
                    { key: 'total', header: 'Sessions', cell: (r) => r.totalSessions },
                    { key: 'rate', header: 'Rate', cell: (r) => `${r.attendanceRate}%` },
                  ]}
                />
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {rows.map((item) => (
                <Card key={item.sectionName}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{item.sectionName}</CardTitle>
                    <span className="text-2xl font-semibold">{item.attendanceRate}%</span>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Present {item.presentCount} of {item.totalSessions} sessions · Absent{' '}
                    {Math.max(item.totalSessions - item.presentCount, 0)}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
