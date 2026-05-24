'use client';

import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';

export default function StudentDashboardPage() {
  const { data: grades, isLoading: gradesLoading } = useQuery({
    queryKey: ['student', 'grades'],
    queryFn: () => apiClient<{ grades: unknown[] }>('/students/me/grades'),
  });

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ['student', 'attendance'],
    queryFn: () => apiClient<{ attendance: { sectionName: string; attendanceRate: number }[] }>('/students/me/attendance'),
  });

  const { data: enrollments } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => apiClient<{ enrollments: { status: string }[] }>('/enrollments'),
  });

  return (
    <RoleGuard role="student">
      <div id={ids.student.dashboard.page}>
        <div>
          <h1 id={ids.student.dashboard.title} className="text-2xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Your academic overview</p>
        </div>

        <div id={ids.student.dashboard.kpiGrid} className="grid gap-4 md:grid-cols-3">
          <Card id={ids.student.dashboard.enrolledSections}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Enrolled Sections</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {enrollments?.enrollments.filter((e) => e.status === 'approved').length ?? '—'}
              </p>
            </CardContent>
          </Card>
          <Card id={ids.student.dashboard.coursesWithGrades}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Courses with Grades</CardTitle>
            </CardHeader>
            <CardContent>
              {gradesLoading ? <Skeleton className="h-8 w-12" /> : (
                <p className="text-2xl font-semibold">{grades?.grades.length ?? 0}</p>
              )}
            </CardContent>
          </Card>
          <Card id={ids.student.dashboard.avgAttendance}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceLoading ? <Skeleton className="h-8 w-12" /> : (
                <p className="text-2xl font-semibold">
                  {attendance?.attendance.length
                    ? Math.round(
                        attendance.attendance.reduce((a, b) => a + b.attendanceRate, 0) /
                          attendance.attendance.length,
                      )
                    : '—'}
                  %
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}
