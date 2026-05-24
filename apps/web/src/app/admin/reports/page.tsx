'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { AcademicTerm, CourseSection } from '@sis/shared';

export default function AdminReportsPage() {
  const [termId, setTermId] = useState('');
  const [sectionId, setSectionId] = useState('');

  const { data: terms } = useQuery({
    queryKey: ['terms'],
    queryFn: () => apiClient<{ terms: AcademicTerm[] }>('/terms'),
  });

  const { data: sections } = useQuery({
    queryKey: ['sections'],
    queryFn: () => apiClient<{ sections: CourseSection[] }>('/sections'),
  });

  const { data: enrollmentReport } = useQuery({
    queryKey: ['reports', 'enrollment', termId],
    queryFn: () =>
      apiClient<{
        report: {
          totalEnrollments: number;
          byStatus: Record<string, number>;
          byProgram: { programCode: string; count: number }[];
        };
      }>(`/admin/reports/enrollment?termId=${termId}`),
    enabled: !!termId,
  });

  const { data: gradeReport } = useQuery({
    queryKey: ['reports', 'grades', sectionId],
    queryFn: () =>
      apiClient<{
        report: {
          averageScore: number;
          distribution: { letter: string; count: number }[];
          studentGrades: {
            studentId: string;
            finalScore: number;
            letterGrade: string;
          }[];
        };
      }>(`/admin/reports/grades/${sectionId}`),
    enabled: !!sectionId,
  });

  const { data: attendanceReport } = useQuery({
    queryKey: ['reports', 'attendance', sectionId],
    queryFn: () =>
      apiClient<{
        report: {
          averageAttendanceRate: number;
          chronicAbsentees: {
            studentName: string;
            absentCount: number;
            attendanceRate: number;
          }[];
        };
      }>(`/admin/reports/attendance/${sectionId}`),
    enabled: !!sectionId,
  });

  const maxDistribution = Math.max(
    ...(gradeReport?.report.distribution.map((d) => d.count) ?? [1]),
    1,
  );

  return (
    <RoleGuard role="admin">
      <div id={ids.admin.reports.page} className="space-y-8">
        <PageHeader
          titleId={ids.admin.reports.title}
          title="Reports"
          description="Enrollment, grades, and attendance analytics"
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card id={ids.admin.reports.enrollmentCard}>
            <CardHeader>
              <CardTitle>Enrollment Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={ids.admin.reports.termSelect}>Term</Label>
                <select
                  id={ids.admin.reports.termSelect}
                  className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={termId}
                  onChange={(e) => setTermId(e.target.value)}
                >
                  <option value="">Select term</option>
                  {terms?.terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              {enrollmentReport ? (
                <div className="space-y-4">
                  <p className="text-sm">
                    Total enrollments:{' '}
                    <span className="font-semibold">{enrollmentReport.report.totalEnrollments}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(enrollmentReport.report.byStatus).map(([status, count]) => (
                      <Badge key={status} variant="secondary">
                        {status}: {count}
                      </Badge>
                    ))}
                  </div>
                  <DataTable
                    rows={enrollmentReport.report.byProgram}
                    rowKey={(row) => row.programCode}
                    emptyMessage="No program breakdown."
                    columns={[
                      { key: 'program', header: 'Program', cell: (row) => row.programCode },
                      { key: 'count', header: 'Enrollments', cell: (row) => row.count },
                    ]}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card id={ids.admin.reports.gradesCard}>
            <CardHeader>
              <CardTitle>Grade & Attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={ids.admin.reports.sectionSelect}>Section</Label>
                <select
                  id={ids.admin.reports.sectionSelect}
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
              {gradeReport ? (
                <div className="space-y-4">
                  <p className="text-sm">
                    Average score:{' '}
                    <span className="font-semibold">
                      {gradeReport.report.averageScore.toFixed(1)}
                    </span>
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Grade distribution
                    </p>
                    {gradeReport.report.distribution.map((d) => (
                      <div key={d.letter} className="flex items-center gap-3 text-sm">
                        <span className="w-8 font-medium">{d.letter}</span>
                        <div className="h-2 flex-1 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${(d.count / maxDistribution) * 100}%` }}
                          />
                        </div>
                        <span className="w-6 text-muted-foreground">{d.count}</span>
                      </div>
                    ))}
                  </div>
                  <DataTable
                    rows={gradeReport.report.studentGrades}
                    rowKey={(g) => g.studentId}
                    emptyMessage="No graded students."
                    columns={[
                      { key: 'score', header: 'Final score', cell: (g) => g.finalScore.toFixed(1) },
                      { key: 'letter', header: 'Letter', cell: (g) => g.letterGrade },
                    ]}
                  />
                </div>
              ) : null}
              {attendanceReport ? (
                <div className="space-y-4 border-t pt-4">
                  <p className="text-sm">
                    Average attendance:{' '}
                    <span className="font-semibold">
                      {attendanceReport.report.averageAttendanceRate.toFixed(1)}%
                    </span>
                  </p>
                  <DataTable
                    rows={attendanceReport.report.chronicAbsentees}
                    rowKey={(row) => row.studentName}
                    emptyMessage="No chronic absentees."
                    columns={[
                      { key: 'name', header: 'Student', cell: (row) => row.studentName },
                      { key: 'absent', header: 'Absences', cell: (row) => row.absentCount },
                      {
                        key: 'rate',
                        header: 'Attendance %',
                        cell: (row) => `${row.attendanceRate}%`,
                      },
                    ]}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}
