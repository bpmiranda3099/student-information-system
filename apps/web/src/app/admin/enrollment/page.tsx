'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';

type EnrollmentRow = {
  id: string;
  status: string;
  studentName?: string;
  section?: { subject?: { code: string }; sectionCode: string };
};

const STATUS_TABS = ['all', 'pending', 'approved', 'dropped'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

export default function AdminEnrollmentPage() {
  const queryClient = useQueryClient();
  const [statusTab, setStatusTab] = useState<StatusTab>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => apiClient<{ enrollments: EnrollmentRow[] }>('/enrollments'),
  });

  const counts = useMemo(() => {
    const all = data?.enrollments ?? [];
    return {
      all: all.length,
      pending: all.filter((e) => e.status === 'pending').length,
      approved: all.filter((e) => e.status === 'approved').length,
      dropped: all.filter((e) => e.status === 'dropped').length,
    };
  }, [data]);

  const filtered = useMemo(() => {
    const all = data?.enrollments ?? [];
    if (statusTab === 'all') return all;
    return all.filter((e) => e.status === statusTab);
  }, [data, statusTab]);

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient(`/enrollments/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success('Enrollment updated');
    },
  });

  return (
    <RoleGuard role="admin">
      <div id={ids.admin.enrollment.page} className="space-y-8">
        <PageHeader
          titleId={ids.admin.enrollment.title}
          title="Enrollment Management"
          description={`${counts.pending} pending · ${counts.approved} approved · ${counts.dropped} dropped`}
        />

        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab}
              size="sm"
              variant={statusTab === tab ? 'default' : 'outline'}
              onClick={() => setStatusTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} ({counts[tab]})
            </Button>
          ))}
        </div>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <DataTable
                id={ids.admin.enrollment.table}
                rows={filtered}
                rowKey={(e) => e.id}
                emptyMessage="No enrollments in this category."
                columns={[
                  { key: 'student', header: 'Student', cell: (e) => e.studentName ?? '—' },
                  {
                    key: 'section',
                    header: 'Section',
                    cell: (e) =>
                      e.section
                        ? `${e.section.subject?.code ?? '—'} — ${e.section.sectionCode}`
                        : '—',
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    cell: (e) => <Badge variant="secondary">{e.status}</Badge>,
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    cell: (e) =>
                      e.status === 'pending' ? (
                        <div className="space-x-2">
                          <Button
                            id={ids.admin.enrollment.approve(e.id)}
                            size="sm"
                            onClick={() => updateMutation.mutate({ id: e.id, status: 'approved' })}
                          >
                            Approve
                          </Button>
                          <Button
                            id={ids.admin.enrollment.drop(e.id)}
                            size="sm"
                            variant="outline"
                            onClick={() => updateMutation.mutate({ id: e.id, status: 'dropped' })}
                          >
                            Drop
                          </Button>
                        </div>
                      ) : (
                        '—'
                      ),
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
