'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { Announcement, ExternalAlert } from '@sis/shared';

export default function AdminAnnouncementsPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('news');

  const { data: announcements } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => apiClient<{ announcements: Announcement[] }>('/announcements'),
  });

  const { data: inbox } = useQuery({
    queryKey: ['admin', 'alerts', 'inbox'],
    queryFn: () => apiClient<{ alerts: ExternalAlert[] }>('/admin/alerts/inbox'),
  });

  const createAnnouncement = useMutation({
    mutationFn: () =>
      apiClient('/announcements', {
        method: 'POST',
        body: { title, body, category, severity: 'medium' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setTitle('');
      setBody('');
      toast.success('Announcement published');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const syncAlerts = useMutation({
    mutationFn: () => apiClient('/admin/alerts/sync', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'alerts'] });
      toast.success('Alert sync started');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const promote = useMutation({
    mutationFn: (alertId: string) =>
      apiClient(`/admin/announcements/promote/${alertId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'alerts'] });
      toast.success('Alert promoted to announcement');
    },
  });

  const dismiss = useMutation({
    mutationFn: (alertId: string) =>
      apiClient(`/admin/alerts/${alertId}/dismiss`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'alerts'] }),
  });

  return (
    <RoleGuard role="admin">
      <div id={ids.admin.announcements.page} className="space-y-8">
        <PageHeader
          titleId={ids.admin.announcements.title}
          title="Announcements"
          description="Publish news and review live ingested PH alerts"
          actions={
            <Button size="sm" variant="outline" onClick={() => syncAlerts.mutate()} disabled={syncAlerts.isPending}>
              Sync external alerts
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Create announcement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sis-admin-announcement-title">Title</Label>
              <Input id="sis-admin-announcement-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sis-admin-announcement-body">Body</Label>
              <Input id="sis-admin-announcement-body" value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sis-admin-announcement-category">Category</Label>
              <select
                id="sis-admin-announcement-category"
                className="flex h-10 w-full max-w-xs rounded-md border bg-background px-3 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {['news', 'no_classes', 'disaster', 'holiday'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={() => createAnnouncement.mutate()} disabled={!title || !body}>
              Publish
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingested alerts inbox</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              id={ids.admin.announcements.inbox}
              rows={inbox?.alerts ?? []}
              rowKey={(a) => a.id}
              emptyMessage="No ingested alerts. Run sync to fetch live PH feeds."
              columns={[
                { key: 'provider', header: 'Provider', cell: (a) => a.provider },
                { key: 'title', header: 'Title', cell: (a) => a.title },
                {
                  key: 'severity',
                  header: 'Severity',
                  cell: (a) => <Badge variant="secondary">{a.severity}</Badge>,
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  cell: (a) => (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => promote.mutate(a.id)}>
                        Promote
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => dismiss.mutate(a.id)}>
                        Dismiss
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Published announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              rows={announcements?.announcements ?? []}
              rowKey={(a) => a.id}
              emptyMessage="No announcements yet."
              columns={[
                { key: 'title', header: 'Title', cell: (a) => a.title },
                {
                  key: 'category',
                  header: 'Category',
                  cell: (a) => <Badge variant="secondary">{a.category}</Badge>,
                },
                {
                  key: 'source',
                  header: 'Source',
                  cell: (a) => a.source,
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
