'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { CourseSection } from '@sis/shared';

export default function FacultyGradesPage() {
  const queryClient = useQueryClient();
  const [sectionId, setSectionId] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});

  const { data: sections } = useQuery({
    queryKey: ['sections'],
    queryFn: () => apiClient<{ sections: CourseSection[] }>('/sections'),
  });

  const { data: gradeData, isLoading } = useQuery({
    queryKey: ['grades', sectionId],
    queryFn: () =>
      apiClient<{
        scheme: unknown;
        components: { id: string; name: string; maxScore: number; type: string }[];
        grades: { studentId: string; studentName: string; finalScore: number; letterGrade: string }[];
      }>(`/sections/${sectionId}/grades`),
    enabled: !!sectionId,
  });

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
    <RoleGuard role="faculty">
      <div id={ids.faculty.grades.page}>
        <div>
          <h1 id={ids.faculty.grades.title} className="text-2xl font-semibold tracking-tight">
            Grade Encoding
          </h1>
          <p className="text-sm text-muted-foreground">Enter scores per student and component</p>
        </div>

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

        {sectionId && gradeData && (
          <Card id={ids.faculty.grades.sheet}>
            <CardHeader>
              <CardTitle>Grade Sheet</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <Table id={ids.faculty.grades.table}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      {gradeData.components.map((c) => (
                        <TableHead key={c.id}>{c.name}</TableHead>
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
    </RoleGuard>
  );
}
