'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';

interface GradeItem {
  section: { subject: { code: string; title: string }; sectionCode: string };
  grade: { finalScore: number; letterGrade: string; categoryAverages: Record<string, number> };
}

export default function StudentGradesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['student', 'grades'],
    queryFn: () => apiClient<{ grades: GradeItem[] }>('/students/me/grades'),
  });

  const gpa = useMemo(() => {
    if (!data?.grades.length) return null;
    const sum = data.grades.reduce((acc, g) => acc + g.grade.finalScore, 0);
    return (sum / data.grades.length).toFixed(1);
  }, [data]);

  return (
    <RoleGuard role="student">
      <div id={ids.student.grades.page} className="space-y-8">
        <PageHeader
          titleId={ids.student.grades.title}
          title="Grades"
          description="Your transcript by section"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Courses graded" value={data?.grades.length ?? 0} isLoading={isLoading} />
          <StatCard label="Average score" value={gpa ?? '—'} isLoading={isLoading} />
          <StatCard
            label="Latest letter"
            value={data?.grades[0]?.grade.letterGrade ?? '—'}
            isLoading={isLoading}
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading grades…</p>
        ) : data?.grades.length === 0 ? (
          <EmptyState
            id={ids.student.grades.empty}
            title="No grades posted yet"
            description="Grades will appear here once faculty encodes them."
          />
        ) : (
          <div id={ids.student.grades.list} className="space-y-4">
            {data?.grades.map((item, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">
                    {item.section.subject.code} — Section {item.section.sectionCode}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-semibold">{item.grade.finalScore.toFixed(1)}</span>
                    <Badge>{item.grade.letterGrade}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">Category breakdown</summary>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {Object.entries(item.grade.categoryAverages).map(([cat, avg]) => (
                        <span key={cat} className="rounded-md border px-2 py-1 text-xs">
                          {cat}: {avg.toFixed(1)}%
                        </span>
                      ))}
                    </div>
                  </details>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
