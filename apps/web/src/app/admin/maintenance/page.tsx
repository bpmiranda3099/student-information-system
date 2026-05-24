'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { AcademicTerm } from '@sis/shared';

export default function AdminMaintenancePage() {
  const queryClient = useQueryClient();

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

  const archiveMutation = useMutation({
    mutationFn: (termId: string) =>
      apiClient(`/admin/maintenance/archive-term/${termId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      toast.success('Term archived');
    },
  });

  return (
    <RoleGuard role="admin">
      <div id={ids.admin.maintenance.page}>
        <div>
          <h1 id={ids.admin.maintenance.title} className="text-2xl font-semibold tracking-tight">
            Maintenance
          </h1>
          <p className="text-sm text-muted-foreground">Term rollover and system jobs</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Archive term</CardTitle>
          </CardHeader>
          <CardContent id={ids.admin.maintenance.archiveList} className="space-y-4">
            {terms?.terms
              .filter((t) => t.status !== 'archived')
              .map((term) => (
                <div key={term.id} className="flex items-center justify-between">
                  <span className="text-sm">{term.name}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => archiveMutation.mutate(term.id)}
                  >
                    Archive
                  </Button>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table id={ids.admin.maintenance.jobsTable}>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs?.jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>{job.type}</TableCell>
                    <TableCell><Badge variant="secondary">{job.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
