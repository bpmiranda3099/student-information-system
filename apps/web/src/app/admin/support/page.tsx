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
import { SUPPORT_TICKET_STATUSES, type SupportTicket } from '@sis/shared';

export default function AdminSupportPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'support'],
    queryFn: () => apiClient<{ tickets: SupportTicket[] }>('/support/admin/tickets'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, resolution }: { id: string; status: string; resolution?: string }) =>
      apiClient(`/support/tickets/${id}`, {
        method: 'PATCH',
        body: { status, resolution },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'support'] });
      toast.success('Ticket updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const tickets = (data?.tickets ?? []).filter((t) =>
    filter === 'all' ? true : t.status === filter,
  );

  return (
    <RoleGuard role="admin">
      <div className="space-y-8">
        <PageHeader title="Help Desk" description="Manage support tickets" />

        <select
          className="flex h-9 w-48 rounded-md border border-input bg-background px-3 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-4">
            {tickets.map((t) => (
              <Card key={t.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{t.subject}</CardTitle>
                  <Badge>{t.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>{t.body}</p>
                  <p className="text-muted-foreground">From: {t.createdByName}</p>
                  <div className="flex flex-wrap gap-2">
                    {SUPPORT_TICKET_STATUSES.map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant="outline"
                        onClick={() => updateMutation.mutate({ id: t.id, status })}
                      >
                        Mark {status}
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
