'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient, apiUpload } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { CourseSection } from '@sis/shared';

function SyllabusContent() {
  const searchParams = useSearchParams();
  const [sectionId, setSectionId] = useState(searchParams.get('section') ?? '');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonWeek, setLessonWeek] = useState(1);

  const { data: sections } = useQuery({
    queryKey: ['sections'],
    queryFn: () => apiClient<{ sections: CourseSection[] }>('/sections'),
  });

  const { data: syllabusData, refetch } = useQuery({
    queryKey: ['syllabus', sectionId],
    queryFn: () =>
      apiClient<{
        syllabus: {
          id: string;
          title: string;
          lessons: { id: string; title: string; week: number; topics: string[] }[];
        } | null;
      }>(`/sections/${sectionId}/syllabus`),
    enabled: !!sectionId,
  });

  const createSyllabus = useMutation({
    mutationFn: () =>
      apiClient(`/sections/${sectionId}/syllabus`, {
        method: 'POST',
        body: { title: 'Course Syllabus', description: '' },
      }),
    onSuccess: () => refetch(),
  });

  const addLesson = useMutation({
    mutationFn: (syllabusId: string) =>
      apiClient(`/syllabus/${syllabusId}/lessons`, {
        method: 'POST',
        body: { title: lessonTitle, week: lessonWeek, topics: [] },
      }),
    onSuccess: () => {
      refetch();
      setLessonTitle('');
      toast.success('Lesson added');
    },
  });

  async function handlePdfUpload(lessonId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await apiUpload(`/lessons/${lessonId}/upload`, formData);
      refetch();
      toast.success('PDF uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={ids.faculty.syllabus.sectionSelect}>Section</Label>
        <select
          id={ids.faculty.syllabus.sectionSelect}
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

      {sectionId && !syllabusData?.syllabus && (
        <Button id={ids.faculty.syllabus.createSyllabus} onClick={() => createSyllabus.mutate()}>
          Create syllabus
        </Button>
      )}

      {syllabusData?.syllabus && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{syllabusData.syllabus.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={ids.faculty.syllabus.lessonTitle}>New lesson title</Label>
                  <Input
                    id={ids.faculty.syllabus.lessonTitle}
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="Week 1: Introduction"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={ids.faculty.syllabus.lessonWeek}>Week</Label>
                  <Input
                    id={ids.faculty.syllabus.lessonWeek}
                    type="number"
                    min={1}
                    value={lessonWeek}
                    onChange={(e) => setLessonWeek(Number(e.target.value))}
                  />
                </div>
              </div>
              <Button
                id={ids.faculty.syllabus.addLesson}
                size="sm"
                disabled={!lessonTitle}
                onClick={() => addLesson.mutate(syllabusData.syllabus!.id)}
              >
                Add lesson
              </Button>
            </CardContent>
          </Card>

          <div id={ids.faculty.syllabus.lessonsList} className="space-y-4">
            {syllabusData.syllabus.lessons.map((lesson) => (
              <Card key={lesson.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">
                    Week {lesson.week}: {lesson.title}
                  </CardTitle>
                  <label className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>Upload PDF</span>
                    </Button>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePdfUpload(lesson.id, file);
                      }}
                    />
                  </label>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function FacultySyllabusPage() {
  return (
    <RoleGuard role="faculty">
      <div id={ids.faculty.syllabus.page}>
        <div>
          <h1 id={ids.faculty.syllabus.title} className="text-2xl font-semibold tracking-tight">
            Syllabus & Lessons
          </h1>
          <p className="text-sm text-muted-foreground">Manage syllabus and upload lesson PDFs</p>
        </div>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <SyllabusContent />
        </Suspense>
      </div>
    </RoleGuard>
  );
}
