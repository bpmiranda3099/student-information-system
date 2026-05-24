'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { CourseSection } from '@sis/shared';

export default function FacultyAttendancePage() {
  const queryClient = useQueryClient();
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0] ?? '');

  const { data: sections } = useQuery({
    queryKey: ['sections'],
    queryFn: () => apiClient<{ sections: CourseSection[] }>('/sections'),
  });

  const { data: sessions, refetch } = useQuery({
    queryKey: ['attendance', 'sessions', sectionId],
    queryFn: () =>
      apiClient<{ sessions: { id: string; date: string; topic: string | null }[] }>(
        `/sections/${sectionId}/attendance/sessions`,
      ),
    enabled: !!sectionId,
  });

  const createSession = useMutation({
    mutationFn: () =>
      apiClient(`/sections/${sectionId}/attendance/sessions`, {
        method: 'POST',
        body: { date, topic: 'Class session' },
      }),
    onSuccess: () => {
      refetch();
      toast.success('Session created');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const markPresent = useMutation({
    mutationFn: ({ sessionId, studentId }: { sessionId: string; studentId: string }) =>
      apiClient(`/attendance/sessions/${sessionId}/records`, {
        method: 'POST',
        body: { records: [{ studentId, status: 'present' }] },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance marked');
    },
  });

  return (
    <RoleGuard role="faculty">
      <div id={ids.faculty.attendance.page}>
        <div>
          <h1 id={ids.faculty.attendance.title} className="text-2xl font-semibold tracking-tight">
            Attendance
          </h1>
          <p className="text-sm text-muted-foreground">Create sessions and mark attendance</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={ids.faculty.attendance.sectionSelect}>Section</Label>
            <select
              id={ids.faculty.attendance.sectionSelect}
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
            >
              <option value="">Select section</option>
              {sections?.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subject?.code} — {s.sectionCode}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={ids.faculty.attendance.dateInput}>Date</Label>
            <Input
              id={ids.faculty.attendance.dateInput}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {sectionId && (
          <div className="flex justify-end">
            <Button
              id={ids.faculty.attendance.createSession}
              onClick={() => createSession.mutate()}
              disabled={createSession.isPending}
            >
              Create session
            </Button>
          </div>
        )}

        <div id={ids.faculty.attendance.sessionsList} className="space-y-4">
          {sessions?.sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <CardTitle className="text-base">{session.date}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    markPresent.mutate({ sessionId: session.id, studentId: 'placeholder' })
                  }
                >
                  Mark all present
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </RoleGuard>
  );
}
