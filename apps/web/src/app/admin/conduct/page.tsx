'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import type { ConductReport } from '@sis/shared';

export default function AdminConductPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['conduct', 'reports'],
    queryFn: () => apiClient<{ reports: ConductReport[] }>('/conduct/reports'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient(`/conduct/reports/${id}`, {
        method: 'PATCH',
        body: { status },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conduct'] });
      toast.success('Report updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <RoleGuard role="admin">
      <div className="space-y-8">
        <PageHeader title="Conduct review" description="Review and resolve student conduct reports" />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (data?.reports ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports.</p>
        ) : (
          <div className="space-y-4">
            {data?.reports.map((r) => (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{r.studentName}</CardTitle>
                  <Badge>{r.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Type: {r.violationType}</p>
                  <p>{r.description}</p>
                  <p className="text-muted-foreground">Reported by {r.reporterName}</p>
                  <div className="flex gap-2 pt-2">
                    {(['under_review', 'resolved', 'dismissed'] as const).map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant="outline"
                        onClick={() => updateMutation.mutate({ id: r.id, status })}
                      >
                        {status.replace('_', ' ')}
                      </Button>
                    ))}
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
