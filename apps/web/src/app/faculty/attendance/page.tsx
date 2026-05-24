'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { AttendanceStatus, CourseSection } from '@sis/shared';

type SectionStudent = {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
};

type AttendanceSession = {
  id: string;
  date: string;
  topic: string | null;
  recordCount: number;
};

type AttendanceRecord = {
  id: string;
  studentId: string;
  status: AttendanceStatus;
  studentName: string;
};

const STATUS_OPTIONS: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

export default function FacultyAttendancePage() {
  return (
    <RoleGuard role="faculty">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <FacultyAttendanceContent />
      </Suspense>
    </RoleGuard>
  );
}

function FacultyAttendanceContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [sectionId, setSectionId] = useState(searchParams.get('section') ?? '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0] ?? '');
  const [topic, setTopic] = useState('Class session');
  const [activeSessionId, setActiveSessionId] = useState('');
  const [statusByStudent, setStatusByStudent] = useState<Record<string, AttendanceStatus>>({});

  const { data: sections } = useQuery({
    queryKey: ['sections'],
    queryFn: () => apiClient<{ sections: CourseSection[] }>('/sections'),
  });

  const { data: students } = useQuery({
    queryKey: ['sections', sectionId, 'students'],
    queryFn: () => apiClient<{ students: SectionStudent[] }>(`/sections/${sectionId}/students`),
    enabled: !!sectionId,
  });

  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ['attendance', 'sessions', sectionId],
    queryFn: () => apiClient<{ sessions: AttendanceSession[] }>(`/sections/${sectionId}/attendance/sessions`),
    enabled: !!sectionId,
  });

  const { data: records, refetch: refetchRecords } = useQuery({
    queryKey: ['attendance', 'records', activeSessionId],
    queryFn: () =>
      apiClient<{ records: AttendanceRecord[] }>(`/attendance/sessions/${activeSessionId}/records`),
    enabled: !!activeSessionId,
  });

  useEffect(() => {
    if (!students?.students.length) {
      setStatusByStudent({});
      return;
    }
    const fromRecords = Object.fromEntries(
      (records?.records ?? []).map((r) => [r.studentId, r.status]),
    ) as Record<string, AttendanceStatus>;
    const next: Record<string, AttendanceStatus> = {};
    for (const s of students.students) {
      next[s.studentId] = fromRecords[s.studentId] ?? 'present';
    }
    setStatusByStudent(next);
  }, [students, records, activeSessionId]);

  const createSession = useMutation({
    mutationFn: () =>
      apiClient(`/sections/${sectionId}/attendance/sessions`, {
        method: 'POST',
        body: { date, topic },
      }),
    onSuccess: () => {
      void refetchSessions();
      toast.success('Session created');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveRecords = useMutation({
    mutationFn: () =>
      apiClient(`/attendance/sessions/${activeSessionId}/records`, {
        method: 'POST',
        body: {
          records: Object.entries(statusByStudent).map(([studentId, status]) => ({
            studentId,
            status,
          })),
        },
      }),
    onSuccess: () => {
      void refetchRecords();
      void refetchSessions();
      void queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function markAll(status: AttendanceStatus) {
    if (!students?.students.length) return;
    setStatusByStudent(
      Object.fromEntries(students.students.map((s) => [s.studentId, status])) as Record<
        string,
        AttendanceStatus
      >,
    );
  }

  return (
    <div id={ids.faculty.attendance.page} className="space-y-8">
        <PageHeader
          titleId={ids.faculty.attendance.title}
          title="Attendance"
          description="Create sessions and mark attendance per student"
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session setup</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={ids.faculty.attendance.sectionSelect}>Section</Label>
              <select
                id={ids.faculty.attendance.sectionSelect}
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={sectionId}
                onChange={(e) => {
                  setSectionId(e.target.value);
                  setActiveSessionId('');
                }}
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
            <div className="space-y-2">
              <Label htmlFor="sis-faculty-attendance-topic">Topic</Label>
              <Input
                id="sis-faculty-attendance-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button
                id={ids.faculty.attendance.createSession}
                onClick={() => createSession.mutate()}
                disabled={!sectionId || createSession.isPending}
              >
                Create session
              </Button>
            </div>
          </CardContent>
        </Card>

        {sectionId && !sessions?.sessions.length ? (
          <EmptyState
            title="No sessions yet"
            description="Create a session above to start marking attendance."
          />
        ) : null}

        <div id={ids.faculty.attendance.sessionsList} className="grid gap-4 lg:grid-cols-2">
          {sessions?.sessions.map((session) => (
            <Card
              key={session.id}
              className={activeSessionId === session.id ? 'border-primary' : undefined}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{session.date}</CardTitle>
                  <p className="text-xs text-muted-foreground">{session.topic ?? 'Class session'}</p>
                </div>
                <Badge variant="secondary">{session.recordCount} marked</Badge>
              </CardHeader>
              <CardContent>
                <Button
                  size="sm"
                  variant={activeSessionId === session.id ? 'default' : 'outline'}
                  onClick={() => setActiveSessionId(session.id)}
                >
                  {activeSessionId === session.id ? 'Editing' : 'Mark attendance'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {activeSessionId && students?.students.length ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Roster</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => markAll('present')}>
                  All present
                </Button>
                <Button size="sm" variant="outline" onClick={() => markAll('absent')}>
                  All absent
                </Button>
                <Button size="sm" onClick={() => saveRecords.mutate()} disabled={saveRecords.isPending}>
                  Save attendance
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {students.students.map((student) => (
                <div
                  key={student.studentId}
                  className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {student.lastName}, {student.firstName}
                    </p>
                    <p className="text-xs text-muted-foreground">{student.studentNumber}</p>
                  </div>
                  <select
                    className="flex h-9 rounded-md border bg-background px-3 text-sm"
                    value={statusByStudent[student.studentId] ?? 'present'}
                    onChange={(e) =>
                      setStatusByStudent((prev) => ({
                        ...prev,
                        [student.studentId]: e.target.value as AttendanceStatus,
                      }))
                    }
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
    </div>
  );
}
