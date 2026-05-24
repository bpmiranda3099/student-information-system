'use client';

import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

  return (
    <RoleGuard role="student">
      <div id={ids.student.attendance.page}>
        <div>
          <h1 id={ids.student.attendance.title} className="text-2xl font-semibold tracking-tight">
            Attendance
          </h1>
          <p className="text-sm text-muted-foreground">Your attendance by section</p>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : data?.attendance.length === 0 ? (
          <div
            id={ids.student.attendance.empty}
            className="flex flex-col items-center justify-center gap-4 py-16 text-center"
          >
            <p className="text-sm text-muted-foreground">No attendance records yet.</p>
          </div>
        ) : (
          <div id={ids.student.attendance.list} className="space-y-4">
            {data?.attendance.map((item, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{item.sectionName}</CardTitle>
                  <span className="text-2xl font-semibold">{item.attendanceRate}%</span>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Present {item.presentCount} of {item.totalSessions} sessions
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
