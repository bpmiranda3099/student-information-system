'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';

export default function AdminEnrollmentPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () =>
      apiClient<{
        enrollments: {
          id: string;
          status: string;
          studentName?: string;
          section?: { subject?: { code: string }; sectionCode: string };
        }[];
      }>('/enrollments'),
  });

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
      <div id={ids.admin.enrollment.page}>
        <div>
          <h1 id={ids.admin.enrollment.title} className="text-2xl font-semibold tracking-tight">
            Enrollment Management
          </h1>
          <p className="text-sm text-muted-foreground">Approve or drop enrollment requests</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <Table id={ids.admin.enrollment.table}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.enrollments.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.studentName ?? '—'}</TableCell>
                      <TableCell>
                        {e.section?.subject?.code} — {e.section?.sectionCode}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{e.status}</Badge>
                      </TableCell>
                      <TableCell className="space-x-2">
                        {e.status === 'pending' && (
                          <>
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
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
