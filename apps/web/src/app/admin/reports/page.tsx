'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
          chronicAbsentees: { studentName: string; absentCount: number }[];
        };
      }>(`/admin/reports/attendance/${sectionId}`),
    enabled: !!sectionId,
  });

  return (
    <RoleGuard role="admin">
      <div id={ids.admin.reports.page}>
        <div>
          <h1 id={ids.admin.reports.title} className="text-2xl font-semibold tracking-tight">
            Reports
          </h1>
          <p className="text-sm text-muted-foreground">Enrollment, grades, and attendance analytics</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
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
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              {enrollmentReport && (
                <div className="space-y-2 text-sm">
                  <p>Total: {enrollmentReport.report.totalEnrollments}</p>
                  {Object.entries(enrollmentReport.report.byStatus).map(([status, count]) => (
                    <p key={status} className="text-muted-foreground">{status}: {count}</p>
                  ))}
                </div>
              )}
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
              {gradeReport && (
                <p className="text-sm">Average score: {gradeReport.report.averageScore.toFixed(1)}</p>
              )}
              {attendanceReport && (
                <p className="text-sm">
                  Avg attendance: {attendanceReport.report.averageAttendanceRate.toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}
