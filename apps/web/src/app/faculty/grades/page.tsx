'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { CourseSection } from '@sis/shared';

type GradeRow = {
  studentId: string;
  studentName: string;
  finalScore: number;
  letterGrade: string;
  entries?: { componentId: string; score: number }[];
};

export default function FacultyGradesPage() {
  return (
    <RoleGuard role="faculty">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <FacultyGradesContent />
      </Suspense>
    </RoleGuard>
  );
}

function FacultyGradesContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [sectionId, setSectionId] = useState(searchParams.get('section') ?? '');
  const [scores, setScores] = useState<Record<string, number>>({});

  const { data: sections } = useQuery({
    queryKey: ['sections'],
    queryFn: () => apiClient<{ sections: CourseSection[] }>('/sections'),
  });

  const { data: gradeData, isLoading } = useQuery({
    queryKey: ['grades', sectionId],
    queryFn: () =>
      apiClient<{
        scheme: { categoryWeights: { type: string; weight: number }[] } | null;
        components: { id: string; name: string; maxScore: number; type: string }[];
        grades: GradeRow[];
      }>(`/sections/${sectionId}/grades`),
    enabled: !!sectionId,
  });

  useEffect(() => {
    if (!gradeData) return;
    const initial: Record<string, number> = {};
    for (const grade of gradeData.grades) {
      for (const entry of grade.entries ?? []) {
        initial[`${grade.studentId}-${entry.componentId}`] = entry.score;
      }
    }
    setScores(initial);
  }, [gradeData]);

  const saveMutation = useMutation({
    mutationFn: ({ studentId, componentId, score }: { studentId: string; componentId: string; score: number }) =>
      apiClient(`/sections/${sectionId}/grades`, {
        method: 'POST',
        body: { studentId, componentId, score },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades', sectionId] });
      toast.success('Grade saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div id={ids.faculty.grades.page} className="space-y-8">
        <PageHeader
          titleId={ids.faculty.grades.title}
          title="Grade Encoding"
          description="Enter scores per student and component"
        />

        <div className="space-y-2">
          <Label htmlFor={ids.faculty.grades.sectionSelect}>Section</Label>
          <select
            id={ids.faculty.grades.sectionSelect}
            className="flex h-10 w-full max-w-md rounded-md border bg-background px-3 text-sm"
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

        {sectionId && gradeData?.scheme ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grade scheme weights</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {gradeData.scheme.categoryWeights.map((w) => (
                <span key={w.type} className="rounded-md border px-2 py-1 text-xs">
                  {w.type}: {w.weight}%
                </span>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {sectionId && gradeData && (
          <Card id={ids.faculty.grades.sheet}>
            <CardHeader>
              <CardTitle>Grade Sheet</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : !gradeData.components.length ? (
                <p className="text-sm text-muted-foreground">
                  No grade components configured for this section yet.
                </p>
              ) : (
                <Table id={ids.faculty.grades.table}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      {gradeData.components.map((c) => (
                        <TableHead key={c.id}>
                          {c.name}
                          <span className="block text-xs font-normal text-muted-foreground">
                            max {c.maxScore}
                          </span>
                        </TableHead>
                      ))}
                      <TableHead>Final</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gradeData.grades.map((g) => (
                      <TableRow key={g.studentId}>
                        <TableCell>{g.studentName}</TableCell>
                        {gradeData.components.map((c) => {
                          const key = `${g.studentId}-${c.id}`;
                          return (
                            <TableCell key={c.id}>
                              <Input
                                type="number"
                                className="h-8 w-20"
                                max={c.maxScore}
                                min={0}
                                value={scores[key] ?? ''}
                                onChange={(e) =>
                                  setScores((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                                }
                                onBlur={() => {
                                  const score = scores[key];
                                  if (score !== undefined && score >= 0) {
                                    saveMutation.mutate({
                                      studentId: g.studentId,
                                      componentId: c.id,
                                      score,
                                    });
                                  }
                                }}
                              />
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          {g.finalScore.toFixed(1)} ({g.letterGrade})
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
    </div>
  );
}
