'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { RoleGuard } from '@/components/role-guard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { CourseSection } from '@sis/shared';

export default function FacultyDashboardPage() {
  const { data: sections, isLoading } = useQuery({
    queryKey: ['sections'],
    queryFn: () => apiClient<{ sections: CourseSection[] }>('/sections'),
  });

  return (
    <RoleGuard role="faculty">
      <div id={ids.faculty.dashboard.page}>
        <div>
          <h1 id={ids.faculty.dashboard.title} className="text-2xl font-semibold tracking-tight">
            Faculty Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Manage your sections and students</p>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div id={ids.faculty.dashboard.kpiGrid} className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Assigned Sections</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{sections?.sections.length ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link id={ids.faculty.dashboard.encodeGradesLink} href="/faculty/grades">
                    Encode grades
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link id={ids.faculty.dashboard.aiTailorLink} href="/faculty/ai">
                    Tailor lessons with AI
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
