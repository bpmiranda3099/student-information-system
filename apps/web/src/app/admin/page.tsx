'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { UpcomingCalendar } from '@/components/upcoming-calendar';
import { StatCard } from '@/components/stat-card';
import { DataTable } from '@/components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { AcademicTerm } from '@sis/shared';

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

  const { data: enrollments } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () =>
      apiClient<{ enrollments: { id: string; status: string }[] }>('/enrollments'),
  });

  const { data: terms } = useQuery({
    queryKey: ['terms'],
    queryFn: () => apiClient<{ terms: AcademicTerm[] }>('/terms'),
  });

  const { data: jobs } = useQuery({
    queryKey: ['maintenance', 'jobs'],
    queryFn: () =>
      apiClient<{ jobs: { id: string; type: string; status: string; createdAt: string }[] }>(
        '/admin/maintenance/jobs',
      ),
  });

  const pendingCount = enrollments?.enrollments.filter((e) => e.status === 'pending').length ?? 0;
  const hasActiveTerm = terms?.terms.some((t) => t.status === 'active') ?? false;
  const hasSections = (data?.overview.totalSections ?? 0) > 0;

  return (
    <RoleGuard role="admin">
      <div id={ids.admin.dashboard.page} className="space-y-8">
        <PageHeader
          titleId={ids.admin.dashboard.title}
          title="Admin Dashboard"
          description={
            data?.overview.activeTerm
              ? `Active term: ${data.overview.activeTerm}`
              : 'System overview and setup status'
          }
        />

        <AnnouncementBanner id="sis-admin-dashboard-banner" />

        {pendingCount > 0 ? (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium">
                  {pendingCount} enrollment{pendingCount === 1 ? '' : 's'} awaiting approval
                </p>
                <Link href="/admin/enrollment" className="text-sm text-primary underline-offset-4 hover:underline">
                  Review enrollment requests
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div id={ids.admin.dashboard.kpiGrid} className="grid gap-4 md:grid-cols-4">
          <StatCard label="Students" value={data?.overview.totalStudents ?? '—'} isLoading={isLoading} />
          <StatCard label="Faculty" value={data?.overview.totalFaculty ?? '—'} isLoading={isLoading} />
          <StatCard label="Sections" value={data?.overview.totalSections ?? '—'} isLoading={isLoading} />
          <StatCard
            label="Active Enrollments"
            value={data?.overview.activeEnrollments ?? '—'}
            isLoading={isLoading}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Setup checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Active academic term configured', done: hasActiveTerm },
                { label: 'At least one section created', done: hasSections },
                { label: 'No pending enrollments', done: pendingCount === 0 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={item.done ? '' : 'text-muted-foreground'}>{item.label}</span>
                </div>
              ))}
              {!hasActiveTerm || !hasSections ? (
                <Link
                  href="/admin/academic-setup"
                  className="inline-block text-sm text-primary underline-offset-4 hover:underline"
                >
                  Open Academic Setup
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent maintenance jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                rows={jobs?.jobs.slice(0, 5) ?? []}
                rowKey={(job) => job.id}
                emptyMessage="No maintenance jobs yet."
                columns={[
                  { key: 'type', header: 'Type', cell: (job) => job.type },
                  {
                    key: 'status',
                    header: 'Status',
                    cell: (job) => <Badge variant="secondary">{job.status}</Badge>,
                  },
                  {
                    key: 'date',
                    header: 'Date',
                    cell: (job) => new Date(job.createdAt).toLocaleDateString(),
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>

        <UpcomingCalendar id="sis-admin-dashboard-calendar" />
      </div>
    </RoleGuard>
  );
}
