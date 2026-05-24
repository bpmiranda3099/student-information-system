'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { AcademicTerm, Subject } from '@sis/shared';

type FacultyOption = { id: string; name: string; email: string };

export default function AdminMaintenancePage() {
  const queryClient = useQueryClient();
  const [usersOpen, setUsersOpen] = useState(false);

  const [termName, setTermName] = useState('');
  const [termYear, setTermYear] = useState(new Date().getFullYear());
  const [termSemester, setTermSemester] = useState(1);
  const [termStart, setTermStart] = useState('');
  const [termEnd, setTermEnd] = useState('');

  const [sectionSubjectId, setSectionSubjectId] = useState('');
  const [sectionTermId, setSectionTermId] = useState('');
  const [sectionFacultyId, setSectionFacultyId] = useState('');
  const [sectionCode, setSectionCode] = useState('');
  const [sectionCapacity, setSectionCapacity] = useState(30);
  const [sectionSchedule, setSectionSchedule] = useState('');
  const [sectionRoom, setSectionRoom] = useState('');

  const { data: terms } = useQuery({
    queryKey: ['terms'],
    queryFn: () => apiClient<{ terms: AcademicTerm[] }>('/terms'),
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => apiClient<{ subjects: Subject[] }>('/subjects'),
  });

  const { data: faculty } = useQuery({
    queryKey: ['faculty'],
    queryFn: () => apiClient<{ faculty: FacultyOption[] }>('/faculty'),
  });

  const { data: users } = useQuery({
    queryKey: ['auth', 'users'],
    queryFn: () =>
      apiClient<{
        users: { id: string; email: string; firstName: string; lastName: string; role: string }[];
      }>('/auth/users'),
    enabled: usersOpen,
  });

  const { data: jobs } = useQuery({
    queryKey: ['maintenance', 'jobs'],
    queryFn: () =>
      apiClient<{ jobs: { id: string; type: string; status: string; createdAt: string }[] }>(
        '/admin/maintenance/jobs',
      ),
  });

  const createTerm = useMutation({
    mutationFn: () =>
      apiClient('/terms', {
        method: 'POST',
        body: {
          name: termName,
          year: termYear,
          semester: termSemester,
          startDate: termStart,
          endDate: termEnd,
          status: 'active',
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      setTermName('');
      toast.success('Term created');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createSection = useMutation({
    mutationFn: () =>
      apiClient('/sections', {
        method: 'POST',
        body: {
          subjectId: sectionSubjectId,
          termId: sectionTermId,
          facultyId: sectionFacultyId,
          sectionCode,
          capacity: sectionCapacity,
          schedule: sectionSchedule || undefined,
          room: sectionRoom || undefined,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      setSectionCode('');
      toast.success('Section created');
    },
    onError: (err: Error) => toast.error(err.message),
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
      <div id={ids.admin.maintenance.page} className="space-y-8">
        <PageHeader
          titleId={ids.admin.maintenance.title}
          title="Academic Setup"
          description="Create terms and sections, archive terms, and review system jobs"
        />

        <Card>
          <CardHeader>
            <CardTitle>Create term</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sis-admin-setup-term-name">Name</Label>
              <Input
                id="sis-admin-setup-term-name"
                value={termName}
                onChange={(e) => setTermName(e.target.value)}
                placeholder="2026 Spring"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sis-admin-setup-term-year">Year</Label>
              <Input
                id="sis-admin-setup-term-year"
                type="number"
                value={termYear}
                onChange={(e) => setTermYear(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sis-admin-setup-term-semester">Semester</Label>
              <Input
                id="sis-admin-setup-term-semester"
                type="number"
                min={1}
                max={3}
                value={termSemester}
                onChange={(e) => setTermSemester(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sis-admin-setup-term-start">Start date</Label>
              <Input
                id="sis-admin-setup-term-start"
                type="date"
                value={termStart}
                onChange={(e) => setTermStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sis-admin-setup-term-end">End date</Label>
              <Input
                id="sis-admin-setup-term-end"
                type="date"
                value={termEnd}
                onChange={(e) => setTermEnd(e.target.value)}
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button
                onClick={() => createTerm.mutate()}
                disabled={!termName || !termStart || !termEnd || createTerm.isPending}
              >
                Create term
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create section</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="sis-admin-setup-section-subject">Subject</Label>
              <select
                id="sis-admin-setup-section-subject"
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={sectionSubjectId}
                onChange={(e) => setSectionSubjectId(e.target.value)}
              >
                <option value="">Select subject</option>
                {subjects?.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sis-admin-setup-section-term">Term</Label>
              <select
                id="sis-admin-setup-section-term"
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={sectionTermId}
                onChange={(e) => setSectionTermId(e.target.value)}
              >
                <option value="">Select term</option>
                {terms?.terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.status})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sis-admin-setup-section-faculty">Faculty</Label>
              <select
                id="sis-admin-setup-section-faculty"
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={sectionFacultyId}
                onChange={(e) => setSectionFacultyId(e.target.value)}
              >
                <option value="">Select faculty</option>
                {faculty?.faculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sis-admin-setup-section-code">Section code</Label>
              <Input
                id="sis-admin-setup-section-code"
                value={sectionCode}
                onChange={(e) => setSectionCode(e.target.value)}
                placeholder="A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sis-admin-setup-section-capacity">Capacity</Label>
              <Input
                id="sis-admin-setup-section-capacity"
                type="number"
                min={1}
                value={sectionCapacity}
                onChange={(e) => setSectionCapacity(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sis-admin-setup-section-schedule">Schedule</Label>
              <Input
                id="sis-admin-setup-section-schedule"
                value={sectionSchedule}
                onChange={(e) => setSectionSchedule(e.target.value)}
                placeholder="MWF 9:00–10:00"
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="sis-admin-setup-section-room">Room</Label>
              <Input
                id="sis-admin-setup-section-room"
                value={sectionRoom}
                onChange={(e) => setSectionRoom(e.target.value)}
                placeholder="Room 101"
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button
                onClick={() => createSection.mutate()}
                disabled={
                  !sectionSubjectId ||
                  !sectionTermId ||
                  !sectionFacultyId ||
                  !sectionCode ||
                  createSection.isPending
                }
              >
                Create section
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Archive term</CardTitle>
          </CardHeader>
          <CardContent id={ids.admin.maintenance.archiveList} className="space-y-4">
            {terms?.terms
              .filter((t) => t.status !== 'archived')
              .map((term) => (
                <div key={term.id} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{term.name}</span>
                    <Badge variant="secondary" className="ml-2">
                      {term.status}
                    </Badge>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => archiveMutation.mutate(term.id)}>
                    Archive
                  </Button>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>User directory</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setUsersOpen((v) => !v)}>
              {usersOpen ? 'Hide' : 'Show'} users
            </Button>
          </CardHeader>
          {usersOpen ? (
            <CardContent>
              <DataTable
                rows={users?.users ?? []}
                rowKey={(u) => u.id}
                emptyMessage="No users found."
                columns={[
                  {
                    key: 'name',
                    header: 'Name',
                    cell: (u) => `${u.lastName}, ${u.firstName}`,
                  },
                  { key: 'email', header: 'Email', cell: (u) => u.email },
                  {
                    key: 'role',
                    header: 'Role',
                    cell: (u) => <Badge variant="secondary">{u.role}</Badge>,
                  },
                ]}
              />
            </CardContent>
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              id={ids.admin.maintenance.jobsTable}
              rows={jobs?.jobs ?? []}
              rowKey={(job) => job.id}
              emptyMessage="No maintenance jobs yet."
              columns={[
                { key: 'type', header: 'Type', cell: (job) => job.type },
                {
                  key: 'status',
                  header: 'Status',
                  cell: (job) => <Badge variant="secondary">{job.status}</Badge>,
                },
                {
                  key: 'date',
                  header: 'Date',
                  cell: (job) => new Date(job.createdAt).toLocaleDateString(),
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
