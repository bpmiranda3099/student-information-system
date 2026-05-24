'use client';

import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

  return (
    <RoleGuard role="student">
      <div id={ids.student.grades.page}>
        <div>
          <h1 id={ids.student.grades.title} className="text-2xl font-semibold tracking-tight">
            Grades
          </h1>
          <p className="text-sm text-muted-foreground">Your transcript by section</p>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : data?.grades.length === 0 ? (
          <div
            id={ids.student.grades.empty}
            className="flex flex-col items-center justify-center gap-4 py-16 text-center"
          >
            <p className="text-sm text-muted-foreground">No grades posted yet.</p>
          </div>
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
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(item.grade.categoryAverages).map(([cat, avg]) => (
                      <span key={cat} className="text-xs text-muted-foreground">
                        {cat}: {avg.toFixed(1)}%
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
