'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import { getAccessToken } from '@/lib/auth-session';

export default function AdminDataMaintenancePage() {
  const { data: orphans } = useQuery({
    queryKey: ['maintenance', 'orphans'],
    queryFn: () =>
      apiClient<{
        orphans: {
          sectionsMissingFaculty: number;
          enrollmentsOnArchivedTerms: number;
          sections: { id: string; label: string; term: string }[];
          enrollments: { id: string; student: string; section: string; term: string }[];
        };
      }>('/admin/maintenance/orphans'),
  });

  const { data: jobs } = useQuery({
    queryKey: ['maintenance', 'jobs'],
    queryFn: () =>
      apiClient<{
        jobs: { id: string; type: string; status: string; createdAt: string }[];
        alertLogs: { id: string; provider: string; status: string; fetchedCount: number; ranAt: string }[];
      }>('/admin/maintenance/jobs'),
  });

  async function exportEnrollments() {
    const token = getAccessToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const res = await fetch(`${apiUrl}/admin/maintenance/export/enrollments`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enrollments.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <RoleGuard role="admin">
      <div id={ids.admin.maintenance.data.page} className="space-y-8">
        <PageHeader
          title="Data Maintenance"
          description="Exports, orphan review, and job history"
          actions={
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/maintenance">Back to maintenance</Link>
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Export</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={exportEnrollments}>Download enrollments CSV</Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Opens a CSV export in a new tab (requires active admin session).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orphan preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              Sections with inactive faculty:{' '}
              <span className="font-semibold">{orphans?.orphans.sectionsMissingFaculty ?? 0}</span>
            </p>
            <p className="text-sm">
              Approved enrollments on archived terms:{' '}
              <span className="font-semibold">{orphans?.orphans.enrollmentsOnArchivedTerms ?? 0}</span>
            </p>
            <DataTable
              rows={orphans?.orphans.enrollments ?? []}
              rowKey={(e) => e.id}
              emptyMessage="No orphan enrollments detected."
              columns={[
                { key: 'student', header: 'Student', cell: (e) => e.student },
                { key: 'section', header: 'Section', cell: (e) => e.section },
                { key: 'term', header: 'Term', cell: (e) => e.term },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System jobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <DataTable
              id={ids.admin.maintenance.jobsTable}
              rows={jobs?.jobs ?? []}
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
            <div>
              <p className="mb-2 text-sm font-medium">Alert fetch logs</p>
              <DataTable
                rows={jobs?.alertLogs ?? []}
                rowKey={(log) => log.id}
                emptyMessage="No alert sync logs yet."
                columns={[
                  { key: 'provider', header: 'Provider', cell: (log) => log.provider },
                  { key: 'status', header: 'Status', cell: (log) => log.status },
                  { key: 'count', header: 'Fetched', cell: (log) => log.fetchedCount },
                  {
                    key: 'ranAt',
                    header: 'Ran at',
                    cell: (log) => new Date(log.ranAt).toLocaleString(),
                  },
                ]}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
