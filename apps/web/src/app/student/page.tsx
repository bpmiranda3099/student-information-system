'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { UpcomingCalendar } from '@/components/upcoming-calendar';
import { StatCard } from '@/components/stat-card';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { Enrollment } from '@sis/shared';

interface GradeItem {
  section: { subject: { code: string; title: string }; sectionCode: string };
  grade: { finalScore: number; letterGrade: string };
}

export default function StudentDashboardPage() {
  const { data: grades, isLoading: gradesLoading } = useQuery({
    queryKey: ['student', 'grades'],
    queryFn: () => apiClient<{ grades: GradeItem[] }>('/students/me/grades'),
  });

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ['student', 'attendance'],
    queryFn: () =>
      apiClient<{ attendance: { sectionName: string; attendanceRate: number }[] }>(
        '/students/me/attendance',
      ),
  });

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => apiClient<{ enrollments: Enrollment[] }>('/enrollments'),
  });

  const approved = enrollments?.enrollments.filter((e) => e.status === 'approved') ?? [];
  const pending = enrollments?.enrollments.filter((e) => e.status === 'pending') ?? [];
  const avgAttendance =
    attendance?.attendance.length
      ? Math.round(
          attendance.attendance.reduce((a, b) => a + b.attendanceRate, 0) /
            attendance.attendance.length,
        )
      : null;

  return (
    <RoleGuard role="student">
      <div id={ids.student.dashboard.page} className="space-y-8">
        <PageHeader
          titleId={ids.student.dashboard.title}
          title="Dashboard"
          description="Your academic overview"
          actions={
            <Button size="sm" asChild>
              <Link href="/student/enrollment">Browse sections</Link>
            </Button>
          }
        />

        <AnnouncementBanner id="sis-student-dashboard-banner" />

        <div id={ids.student.dashboard.kpiGrid} className="grid gap-4 md:grid-cols-4">
          <StatCard
            id={ids.student.dashboard.enrolledSections}
            label="Enrolled sections"
            value={approved.length}
            hint={pending.length ? `${pending.length} pending` : undefined}
            isLoading={enrollmentsLoading}
          />
          <StatCard
            id={ids.student.dashboard.coursesWithGrades}
            label="Courses with grades"
            value={grades?.grades.length ?? 0}
            isLoading={gradesLoading}
          />
          <StatCard
            id={ids.student.dashboard.avgAttendance}
            label="Avg attendance"
            value={avgAttendance !== null ? `${avgAttendance}%` : '—'}
            isLoading={attendanceLoading}
          />
          <StatCard label="Pending requests" value={pending.length} isLoading={enrollmentsLoading} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">My enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              id={ids.student.dashboard.enrollmentsTable}
              rows={enrollments?.enrollments ?? []}
              rowKey={(e) => e.id}
              emptyMessage="No enrollments yet. Browse available sections to enroll."
              columns={[
                {
                  key: 'course',
                  header: 'Course',
                  cell: (e) =>
                    e.section
                      ? `${e.section.subject?.code ?? '—'} — ${e.section.sectionCode}`
                      : '—',
                },
                {
                  key: 'schedule',
                  header: 'Schedule',
                  cell: (e) => e.section?.schedule ?? '—',
                },
                {
                  key: 'status',
                  header: 'Status',
                  cell: (e) => <Badge variant="secondary">{e.status}</Badge>,
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card id={ids.student.dashboard.recentGrades}>
          <CardHeader>
            <CardTitle className="text-base">Recent grades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {gradesLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !grades?.grades.length ? (
              <p className="text-sm text-muted-foreground">No grades posted yet.</p>
            ) : (
              grades.grades.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {item.section.subject.code} — {item.section.sectionCode}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.section.subject.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{item.grade.finalScore.toFixed(1)}</p>
                    <Badge>{item.grade.letterGrade}</Badge>
                  </div>
                </div>
              ))
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/student/grades">View all grades</Link>
            </Button>
          </CardContent>
        </Card>

        <UpcomingCalendar id="sis-student-dashboard-calendar" />
      </div>
    </RoleGuard>
  );
}
