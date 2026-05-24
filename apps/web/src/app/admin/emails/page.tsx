'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError, apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import { cn } from '@/lib/utils';

const textareaClassName =
  'flex min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

type ResendEmail = {
  id: string;
  to?: string | string[];
  subject?: string;
  status?: string;
  created_at?: string;
  scheduled_at?: string;
  last_event?: string;
};

function parseRecipients(value: string): string[] {
  return value
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
}

function formatRecipients(to: ResendEmail['to']): string {
  if (!to) return '—';
  return Array.isArray(to) ? to.join(', ') : to;
}

export default function AdminEmailsPage() {
  const queryClient = useQueryClient();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('<p>Hello from SIS</p>');
  const [scheduledAt, setScheduledAt] = useState('');
  const [batchJson, setBatchJson] = useState(
    JSON.stringify(
      [
        {
          to: ['delivered@resend.dev'],
          subject: 'Batch message 1',
          html: '<p>First message</p>',
        },
        {
          to: ['delivered@resend.dev'],
          subject: 'Batch message 2',
          html: '<p>Second message</p>',
        },
      ],
      null,
      2,
    ),
  );
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState('');

  const {
    data: listData,
    isLoading: listLoading,
    isFetching: listFetching,
    refetch: refetchEmails,
    error: listError,
  } = useQuery({
    queryKey: ['admin', 'emails'],
    queryFn: () => apiClient<{ emails: ResendEmail[] | { data?: ResendEmail[] } }>('/admin/emails'),
    retry: false,
  });

  const emails: ResendEmail[] = Array.isArray(listData?.emails)
    ? listData.emails
    : ((listData?.emails as { data?: ResendEmail[] } | undefined)?.data ?? []);

  const {
    data: detailData,
    isLoading: detailLoading,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ['admin', 'emails', selectedEmailId],
    queryFn: () => apiClient<{ email: ResendEmail }>(`/admin/emails/${selectedEmailId}`),
    enabled: Boolean(selectedEmailId),
    retry: false,
  });

  const { data: attachmentsData, isLoading: attachmentsLoading } = useQuery({
    queryKey: ['admin', 'emails', selectedEmailId, 'attachments'],
    queryFn: () =>
      apiClient<{ attachments: unknown[] | { data?: unknown[] } }>(
        `/admin/emails/${selectedEmailId}/attachments`,
      ),
    enabled: Boolean(selectedEmailId),
    retry: false,
  });

  const attachments: unknown[] = Array.isArray(attachmentsData?.attachments)
    ? attachmentsData.attachments
    : ((attachmentsData?.attachments as { data?: unknown[] } | undefined)?.data ?? []);

  const sendMutation = useMutation({
    mutationFn: () =>
      apiClient('/admin/emails/send', {
        method: 'POST',
        body: {
          to: parseRecipients(to),
          subject,
          html,
          ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
        },
      }),
    onSuccess: () => {
      toast.success('Email queued');
      queryClient.invalidateQueries({ queryKey: ['admin', 'emails'] });
      setSubject('');
      setScheduledAt('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const batchMutation = useMutation({
    mutationFn: () => {
      const parsed = JSON.parse(batchJson) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error('Batch payload must be a JSON array');
      }
      return apiClient('/admin/emails/batch', {
        method: 'POST',
        body: { emails: parsed },
      });
    },
    onSuccess: () => {
      toast.success('Batch queued');
      queryClient.invalidateQueries({ queryKey: ['admin', 'emails'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (emailId: string) =>
      apiClient(`/admin/emails/${emailId}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Email cancelled');
      refetchDetail();
      refetchEmails();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ emailId, scheduledAt: nextSchedule }: { emailId: string; scheduledAt: string }) =>
      apiClient(`/admin/emails/${emailId}`, {
        method: 'PATCH',
        body: { scheduledAt: new Date(nextSchedule).toISOString() },
      }),
    onSuccess: () => {
      toast.success('Schedule updated');
      refetchDetail();
      refetchEmails();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resendNotConfigured =
    listError instanceof ApiError && listError.status === 503;

  return (
    <RoleGuard role="admin">
      <div id={ids.admin.emails.page} className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 id={ids.admin.emails.title} className="text-2xl font-semibold tracking-tight">
              Email Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Send, schedule, and inspect emails via Resend
            </p>
          </div>
          <Button
            id={ids.admin.emails.refresh}
            variant="outline"
            size="sm"
            onClick={() => refetchEmails()}
            disabled={listFetching}
          >
            {listFetching ? 'Refreshing…' : 'Refresh list'}
          </Button>
        </div>

        {resendNotConfigured && (
          <Card id={ids.admin.emails.notConfigured}>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Resend is not configured on the API (`RESEND_API_KEY`). Sends are logged locally; list
              and retrieve operations require the API key.
            </CardContent>
          </Card>
        )}

        <Card id={ids.admin.emails.sendCard}>
          <CardHeader>
            <CardTitle>Send email</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor={ids.admin.emails.to}>To (comma-separated)</Label>
              <Input
                id={ids.admin.emails.to}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="student@sis.edu, delivered@resend.dev"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={ids.admin.emails.subject}>Subject</Label>
              <Input
                id={ids.admin.emails.subject}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={ids.admin.emails.html}>HTML body</Label>
              <textarea
                id={ids.admin.emails.html}
                className={textareaClassName}
                value={html}
                onChange={(e) => setHtml(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={ids.admin.emails.scheduledAt}>Schedule (optional)</Label>
              <Input
                id={ids.admin.emails.scheduledAt}
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button
                id={ids.admin.emails.sendButton}
                onClick={() => sendMutation.mutate()}
                disabled={!to || !subject || !html || sendMutation.isPending}
              >
                Send
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card id={ids.admin.emails.batchCard}>
          <CardHeader>
            <CardTitle>Batch send</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={ids.admin.emails.batchJson}>Emails JSON array</Label>
              <textarea
                id={ids.admin.emails.batchJson}
                className={cn(textareaClassName, 'min-h-[180px] font-mono text-xs')}
                value={batchJson}
                onChange={(e) => setBatchJson(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button
                id={ids.admin.emails.batchButton}
                variant="secondary"
                onClick={() => batchMutation.mutate()}
                disabled={!batchJson || batchMutation.isPending}
              >
                Send batch
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card id={ids.admin.emails.listCard}>
          <CardHeader>
            <CardTitle>Recent emails</CardTitle>
          </CardHeader>
          <CardContent>
            {listLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : listError && !resendNotConfigured ? (
              <p className="text-sm text-destructive">{(listError as Error).message}</p>
            ) : emails.length === 0 ? (
              <p id={ids.admin.emails.empty} className="text-sm text-muted-foreground">
                {resendNotConfigured ? 'Configure Resend to list sent emails.' : 'No emails yet.'}
              </p>
            ) : (
              <Table id={ids.admin.emails.table}>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="font-mono text-xs">{email.id.slice(0, 8)}…</TableCell>
                      <TableCell className="max-w-[160px] truncate text-xs">
                        {formatRecipients(email.to)}
                      </TableCell>
                      <TableCell>{email.subject ?? '—'}</TableCell>
                      <TableCell>
                        {email.status ? <Badge variant="secondary">{email.status}</Badge> : '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          id={ids.admin.emails.viewButton(email.id)}
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEmailId(email.id)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {selectedEmailId && (
          <Card id={ids.admin.emails.detailCard}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Email detail</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEmailId(null)}>
                Close
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {detailLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : detailData?.email ? (
                <>
                  <dl className="grid gap-2 text-sm md:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">ID</dt>
                      <dd id={ids.admin.emails.detailId} className="font-mono text-xs">
                        {detailData.email.id}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Status</dt>
                      <dd>{detailData.email.status ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">To</dt>
                      <dd>{formatRecipients(detailData.email.to)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Subject</dt>
                      <dd>{detailData.email.subject ?? '—'}</dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      id={ids.admin.emails.cancelButton}
                      variant="destructive"
                      size="sm"
                      onClick={() => cancelMutation.mutate(selectedEmailId)}
                      disabled={cancelMutation.isPending}
                    >
                      Cancel email
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-2">
                      <Label htmlFor={ids.admin.emails.rescheduleAt}>Reschedule</Label>
                      <Input
                        id={ids.admin.emails.rescheduleAt}
                        type="datetime-local"
                        value={rescheduleAt}
                        onChange={(e) => setRescheduleAt(e.target.value)}
                      />
                    </div>
                    <Button
                      id={ids.admin.emails.rescheduleButton}
                      size="sm"
                      variant="secondary"
                      disabled={!rescheduleAt || updateMutation.isPending}
                      onClick={() =>
                        updateMutation.mutate({
                          emailId: selectedEmailId,
                          scheduledAt: rescheduleAt,
                        })
                      }
                    >
                      Update schedule
                    </Button>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-medium">Attachments</h3>
                    {attachmentsLoading ? (
                      <Skeleton className="h-8 w-full" />
                    ) : attachments.length === 0 ? (
                      <p id={ids.admin.emails.attachmentsEmpty} className="text-sm text-muted-foreground">
                        No attachments
                      </p>
                    ) : (
                      <pre
                        id={ids.admin.emails.attachmentsList}
                        className="overflow-x-auto rounded-md bg-muted p-3 text-xs"
                      >
                        {JSON.stringify(attachments, null, 2)}
                      </pre>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Unable to load email details.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGuard>
  );
}
