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
import type { AcademicCalendarEvent, AcademicTerm } from '@sis/shared';

export default function AdminCalendarPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('event');
  const [termId, setTermId] = useState('');

  const { data: terms } = useQuery({
    queryKey: ['terms'],
    queryFn: () => apiClient<{ terms: AcademicTerm[] }>('/terms'),
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar', 'events'],
    queryFn: () => apiClient<{ events: AcademicCalendarEvent[] }>('/calendar/events'),
  });

  const createEvent = useMutation({
    mutationFn: () =>
      apiClient('/calendar/events', {
        method: 'POST',
        body: {
          title,
          startDate,
          endDate: endDate || startDate,
          type,
          termId: termId || undefined,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setTitle('');
      toast.success('Event created');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const syncHolidays = useMutation({
    mutationFn: () =>
      apiClient<{ synced: number }>(`/admin/calendar/sync-holidays?year=${new Date().getFullYear()}`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success(`Synced ${data.synced} PH holidays`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <RoleGuard role="admin">
      <div id={ids.admin.calendar.page} className="space-y-8">
        <PageHeader
          titleId={ids.admin.calendar.title}
          title="Academic Calendar"
          description="Manage term events and sync official Philippine holidays"
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => syncHolidays.mutate()}
              disabled={syncHolidays.isPending}
            >
              Sync PH holidays
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Add event</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sis-admin-calendar-title">Title</Label>
              <Input id="sis-admin-calendar-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sis-admin-calendar-type">Type</Label>
              <select
                id="sis-admin-calendar-type"
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {['event', 'exam', 'enrollment', 'break', 'holiday', 'no_classes'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sis-admin-calendar-start">Start</Label>
              <Input id="sis-admin-calendar-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sis-admin-calendar-end">End</Label>
              <Input id="sis-admin-calendar-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sis-admin-calendar-term">Term</Label>
              <select
                id="sis-admin-calendar-term"
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={termId}
                onChange={(e) => setTermId(e.target.value)}
              >
                <option value="">Optional</option>
                {terms?.terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button onClick={() => createEvent.mutate()} disabled={!title || !startDate}>
                Create event
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <DataTable
                id={ids.admin.calendar.table}
                rows={events?.events ?? []}
                rowKey={(e) => e.id}
                emptyMessage="No calendar events yet."
                columns={[
                  { key: 'title', header: 'Title', cell: (e) => e.title },
                  {
                    key: 'dates',
                    header: 'Dates',
                    cell: (e) =>
                      e.startDate === e.endDate ? e.startDate : `${e.startDate} – ${e.endDate}`,
                  },
                  {
                    key: 'type',
                    header: 'Type',
                    cell: (e) => <Badge variant="secondary">{e.type}</Badge>,
                  },
                  {
                    key: 'source',
                    header: 'Source',
                    cell: (e) => e.source,
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
