'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { CourseSection } from '@sis/shared';

type SectionStudent = {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
};

export default function FacultySectionDetailPage() {
  const params = useParams<{ sectionId: string }>();
  const sectionId = params.sectionId;
  const queryClient = useQueryClient();
  const [announceForm, setAnnounceForm] = useState({ title: '', body: '' });

  const { data: sectionData, isLoading: sectionLoading } = useQuery({
    queryKey: ['sections', sectionId],
    queryFn: () => apiClient<{ section: CourseSection }>(`/sections/${sectionId}`),
    enabled: !!sectionId,
  });

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['sections', sectionId, 'students'],
    queryFn: () => apiClient<{ students: SectionStudent[] }>(`/sections/${sectionId}/students`),
    enabled: !!sectionId,
  });

  const section = sectionData?.section;
  const students = studentsData?.students ?? [];

  const announceMutation = useMutation({
    mutationFn: () =>
      apiClient('/announcements', {
        method: 'POST',
        body: {
          title: announceForm.title,
          body: announceForm.body,
          category: 'news',
          sectionId,
        },
      }),
    onSuccess: () => {
      setAnnounceForm({ title: '', body: '' });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement posted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <RoleGuard role="faculty">
      <div id={ids.faculty.sections.detail(sectionId)} className="space-y-8">
        <PageHeader
          title={section ? `${section.subject?.code} — ${section.sectionCode}` : 'Section'}
          description={
            section
              ? `${section.term?.name ?? 'Term'} · ${section.schedule ?? 'No schedule'} · ${section.room ?? 'No room'}`
              : 'Loading section…'
          }
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/faculty/sections">Back to sections</Link>
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Enrolled"
            value={section?.enrolledCount ?? '—'}
            hint={section ? `Capacity ${section.capacity}` : undefined}
            isLoading={sectionLoading}
          />
          <StatCard label="Students on roster" value={students.length} isLoading={studentsLoading} />
          <StatCard label="Term" value={section?.term?.name ?? '—'} isLoading={sectionLoading} />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/faculty/grades?section=${sectionId}`}>Grades</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/faculty/attendance?section=${sectionId}`}>Attendance</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/faculty/syllabus?section=${sectionId}`}>Syllabus</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/faculty/ai?section=${sectionId}`}>AI Tailoring</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Section announcement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={announceForm.title}
                onChange={(e) => setAnnounceForm({ ...announceForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={announceForm.body}
                onChange={(e) => setAnnounceForm({ ...announceForm, body: e.target.value })}
              />
            </div>
            <Button
              size="sm"
              disabled={!announceForm.title || !announceForm.body || announceMutation.isPending}
              onClick={() => announceMutation.mutate()}
            >
              Post to section
            </Button>
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-4 text-lg font-medium">Student roster</h2>
          <DataTable
            rows={students}
            rowKey={(s) => s.studentId}
            emptyMessage="No approved enrollments for this section."
            columns={[
              {
                key: 'name',
                header: 'Name',
                cell: (s) => `${s.lastName}, ${s.firstName}`,
              },
              { key: 'number', header: 'Student #', cell: (s) => s.studentNumber },
              { key: 'email', header: 'Email', cell: (s) => s.email },
            ]}
          />
        </div>
      </div>
    </RoleGuard>
  );
}
