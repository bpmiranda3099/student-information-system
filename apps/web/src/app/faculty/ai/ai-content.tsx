'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { CourseSection } from '@sis/shared';

export default function FacultyAiPageContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [sectionId, setSectionId] = useState(searchParams.get('section') ?? '');
  const [lessonId, setLessonId] = useState('');
  const [studentId, setStudentId] = useState('');

  const { data: sections } = useQuery({
    queryKey: ['sections'],
    queryFn: () => apiClient<{ sections: CourseSection[] }>('/sections'),
  });

  const { data: students } = useQuery({
    queryKey: ['sections', sectionId, 'students'],
    queryFn: () =>
      apiClient<{ students: { studentId: string; firstName: string; lastName: string }[] }>(
        `/sections/${sectionId}/students`,
      ),
    enabled: !!sectionId,
  });

  const { data: syllabus } = useQuery({
    queryKey: ['syllabus', sectionId],
    queryFn: () =>
      apiClient<{
        syllabus: { lessons: { id: string; title: string; week: number }[] } | null;
      }>(`/sections/${sectionId}/syllabus`),
    enabled: !!sectionId,
  });

  const tailorMutation = useMutation({
    mutationFn: () =>
      apiClient('/ai/tailor-lesson', {
        method: 'POST',
        body: { lessonId, studentId, notifyStudent: true },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'requests'] });
      toast.success('Tailored lesson generated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ['ai', 'requests'],
    queryFn: () =>
      apiClient<{
        requests: {
          id: string;
          lessonTitle: string;
          studentName: string;
          status: string;
          response: string | null;
        }[];
      }>('/ai/requests'),
  });

  useEffect(() => {
    setLessonId('');
    setStudentId('');
  }, [sectionId]);

  return (
    <div id={ids.faculty.ai.page} className="space-y-8">
      <PageHeader
        titleId={ids.faculty.ai.title}
        title="AI Lesson Tailoring"
        description="Generate personalized lessons based on student weak areas"
      />

      <Card>
        <CardHeader>
          <CardTitle>Generate tailored lesson</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={ids.faculty.ai.sectionSelect}>Section</Label>
            <select
              id={ids.faculty.ai.sectionSelect}
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
            >
              <option value="">Select</option>
              {sections?.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subject?.code} — {s.sectionCode}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={ids.faculty.ai.lessonSelect}>Lesson</Label>
            <select
              id={ids.faculty.ai.lessonSelect}
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
              disabled={!sectionId}
            >
              <option value="">Select</option>
              {syllabus?.syllabus?.lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  Week {l.week}: {l.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={ids.faculty.ai.studentSelect}>Student</Label>
            <select
              id={ids.faculty.ai.studentSelect}
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={!sectionId}
            >
              <option value="">Select</option>
              {students?.students.map((s) => (
                <option key={s.studentId} value={s.studentId}>
                  {s.lastName}, {s.firstName}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button
              id={ids.faculty.ai.tailorButton}
              disabled={!lessonId || !studentId || tailorMutation.isPending}
              onClick={() => tailorMutation.mutate()}
            >
              {tailorMutation.isPending ? 'Generating…' : 'Tailor lesson'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading requests…</p>
      ) : !requests?.requests.length ? (
        <EmptyState title="No AI requests yet" description="Generated lessons will appear here." />
      ) : (
        <div id={ids.faculty.ai.requestsList} className="space-y-4">
          {requests.requests.map((req) => (
            <Card key={req.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{req.lessonTitle}</CardTitle>
                  <p className="text-sm text-muted-foreground">{req.studentName}</p>
                </div>
                <Badge variant="secondary">{req.status}</Badge>
              </CardHeader>
              {req.response ? (
                <CardContent>
                  <details>
                    <summary className="cursor-pointer text-sm font-medium">View full response</summary>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{req.response}</p>
                  </details>
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
