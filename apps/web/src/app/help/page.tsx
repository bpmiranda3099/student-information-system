'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { DashboardShell } from '@/components/dashboard-shell';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { SUPPORT_CATEGORIES, type SupportTicket } from '@sis/shared';
import type { Role } from '@sis/shared';

function HelpContent() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ subject: '', body: '', category: 'other' as string });

  const { data, isLoading } = useQuery({
    queryKey: ['support', 'tickets'],
    queryFn: () => apiClient<{ tickets: SupportTicket[] }>('/support/tickets'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient('/support/tickets', {
        method: 'POST',
        body: form,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
      setForm({ subject: '', body: '', category: 'other' });
      toast.success('Ticket submitted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Help Desk" description="Submit issues and track resolution status" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New ticket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {SUPPORT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!form.subject || !form.body || createMutation.isPending}
          >
            Submit ticket
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-sm font-medium">Your tickets</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (data?.tickets ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No tickets yet.</p>
        ) : (
          data?.tickets.map((t) => (
            <Card key={t.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t.subject}</CardTitle>
                <Badge variant="secondary">{t.status}</Badge>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>{t.body}</p>
                {t.resolution && <p className="mt-2 text-foreground">Resolution: {t.resolution}</p>}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default function HelpPage() {
  const { user, isLoading } = useAuth();
  if (isLoading || !user) return null;
  const role = user.role as Role;
  if (!['student', 'faculty', 'admin', 'enrollee'].includes(role)) return null;

  return (
    <DashboardShell role={role}>
      <HelpContent />
    </DashboardShell>
  );
}
