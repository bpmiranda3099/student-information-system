'use client';

import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () =>
      apiClient<{
        overview: {
          totalStudents: number;
          totalFaculty: number;
          totalSections: number;
          activeEnrollments: number;
          activeTerm: string;
        };
      }>('/admin/analytics/overview'),
  });

  return (
    <RoleGuard role="admin">
      <div id={ids.admin.dashboard.page}>
        <div>
          <h1 id={ids.admin.dashboard.title} className="text-2xl font-semibold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {data?.overview.activeTerm ? `Active term: ${data.overview.activeTerm}` : 'System overview'}
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div id={ids.admin.dashboard.kpiGrid} className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'Students', value: data?.overview.totalStudents },
              { label: 'Faculty', value: data?.overview.totalFaculty },
              { label: 'Sections', value: data?.overview.totalSections },
              { label: 'Active Enrollments', value: data?.overview.activeEnrollments },
            ].map((kpi) => (
              <Card key={kpi.label}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{kpi.value ?? '—'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
