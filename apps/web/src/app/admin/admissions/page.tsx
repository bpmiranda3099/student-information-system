'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import type { AdmissionApplication } from '@sis/shared';

interface AdminApplication extends AdmissionApplication {
  enrollee: {
    firstName: string;
    lastName: string;
    email: string;
    programCode: string | null;
    programName: string | null;
    yearLevel: number;
    admissionType: string;
  };
}

export default function AdminAdmissionsPage() {
  const queryClient = useQueryClient();
  const [denyId, setDenyId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'admissions'],
    queryFn: () =>
      apiClient<{ applications: AdminApplication[] }>('/admin/admissions'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/admin/admissions/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admissions'] });
      toast.success('Application approved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const denyMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient(`/admin/admissions/${id}/deny`, {
        method: 'POST',
        body: { reason },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admissions'] });
      setDenyId(null);
      setDenyReason('');
      toast.success('Application denied');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pending = (data?.applications ?? []).filter((a) =>
    ['submitted', 'under_review'].includes(a.status),
  );

  return (
    <RoleGuard role="admin">
      <div className="space-y-8">
        <PageHeader title="Admissions" description="Review enrollee applications" />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending applications.</p>
        ) : (
          <div className="space-y-4">
            {pending.map((app) => (
              <Card key={app.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">
                      {app.enrollee.firstName} {app.enrollee.lastName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{app.enrollee.email}</p>
                  </div>
                  <Badge>{app.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>
                    {app.enrollee.programName} · Year {app.enrollee.yearLevel} ·{' '}
                    {app.enrollee.admissionType}
                  </p>
                  {denyId === app.id ? (
                    <div className="space-y-2">
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Reason for denial"
                        value={denyReason}
                        onChange={(e) => setDenyReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!denyReason.trim() || denyMutation.isPending}
                          onClick={() => denyMutation.mutate({ id: app.id, reason: denyReason })}
                        >
                          Confirm deny
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDenyId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approveMutation.mutate(app.id)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDenyId(app.id)}>
                        Deny
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
