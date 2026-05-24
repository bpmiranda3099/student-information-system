'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { CourseSection } from '@sis/shared';

export default function FacultyDashboardPage() {
  const { data: sections, isLoading } = useQuery({
    queryKey: ['sections'],
    queryFn: () => apiClient<{ sections: CourseSection[] }>('/sections'),
  });

  const list = sections?.sections ?? [];
  const totalEnrolled = list.reduce((acc, s) => acc + s.enrolledCount, 0);

  return (
    <RoleGuard role="faculty">
      <div id={ids.faculty.dashboard.page} className="space-y-8">
        <PageHeader
          titleId={ids.faculty.dashboard.title}
          title="Faculty Dashboard"
          description="Manage your sections and students"
        />

        <div id={ids.faculty.dashboard.kpiGrid} className="grid gap-4 md:grid-cols-3">
          <StatCard label="Assigned sections" value={list.length} isLoading={isLoading} />
          <StatCard label="Total enrolled students" value={totalEnrolled} isLoading={isLoading} />
          <StatCard
            label="Avg class size"
            value={list.length ? Math.round(totalEnrolled / list.length) : '—'}
            isLoading={isLoading}
          />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link id={ids.faculty.dashboard.encodeGradesLink} href="/faculty/grades">
                Encode grades
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/faculty/attendance">Mark attendance</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link id={ids.faculty.dashboard.aiTailorLink} href="/faculty/ai">
                AI tailoring
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-4 text-lg font-medium">Your sections</h2>
          <DataTable
            rows={list}
            rowKey={(s) => s.id}
            emptyMessage="No sections assigned yet."
            columns={[
              {
                key: 'course',
                header: 'Course',
                cell: (s) => `${s.subject?.code ?? '—'} — ${s.sectionCode}`,
              },
              { key: 'schedule', header: 'Schedule', cell: (s) => s.schedule ?? '—' },
              {
                key: 'enrolled',
                header: 'Enrolled',
                cell: (s) => `${s.enrolledCount}/${s.capacity}`,
              },
              {
                key: 'actions',
                header: '',
                cell: (s) => (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/faculty/sections/${s.id}`}>Open</Link>
                  </Button>
                ),
              },
            ]}
          />
        </div>
      </div>
    </RoleGuard>
  );
}
