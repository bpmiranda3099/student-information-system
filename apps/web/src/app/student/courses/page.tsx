'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { Enrollment } from '@sis/shared';

export default function StudentCoursesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => apiClient<{ enrollments: Enrollment[] }>('/enrollments'),
  });

  const approved = data?.enrollments.filter((e) => e.status === 'approved') ?? [];

  return (
    <RoleGuard role="student">
      <div id={ids.student.courses.page} className="space-y-8">
        <PageHeader
          titleId={ids.student.courses.title}
          title="My Courses"
          description="Approved enrollments and quick links to grades and attendance"
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading courses…</p>
        ) : approved.length === 0 ? (
          <EmptyState
            id={ids.student.courses.empty}
            icon={BookOpen}
            title="No enrolled courses"
            description="Browse available sections and submit an enrollment request."
            action={
              <Button asChild>
                <Link href="/student/enrollment">Go to enrollment</Link>
              </Button>
            }
          />
        ) : (
          <div id={ids.student.courses.list} className="grid gap-4 md:grid-cols-2">
            {approved.map((enrollment) => (
              <Card key={enrollment.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {enrollment.section?.subject?.code} — Section {enrollment.section?.sectionCode}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{enrollment.section?.subject?.title}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{enrollment.section?.schedule ?? 'No schedule'}</span>
                    <span>·</span>
                    <span>{enrollment.section?.room ?? 'No room'}</span>
                    <span>·</span>
                    <Badge variant="secondary">{enrollment.section?.term?.name ?? 'Term'}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/student/grades">Grades</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/student/attendance">Attendance</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
