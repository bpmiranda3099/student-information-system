'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
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
