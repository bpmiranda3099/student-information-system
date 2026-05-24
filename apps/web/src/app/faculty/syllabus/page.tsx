'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient, apiUpload } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { CourseSection } from '@sis/shared';

type LessonRow = {
  id: string;
  title: string;
  week: number;
  topics: string[];
  files: { id: string; fileName: string }[];
};

function SyllabusContent() {
  const searchParams = useSearchParams();
  const [sectionId, setSectionId] = useState(searchParams.get('section') ?? '');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonWeek, setLessonWeek] = useState(1);
  const [lessonTopics, setLessonTopics] = useState('');

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
          lessons: LessonRow[];
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
        body: {
          title: lessonTitle,
          week: lessonWeek,
          topics: lessonTopics
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: () => {
      refetch();
      setLessonTitle('');
      setLessonTopics('');
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
              <div className="grid gap-4 md:grid-cols-4">
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
                <div className="space-y-2">
                  <Label htmlFor="sis-faculty-syllabus-lesson-topics">Topics</Label>
                  <Input
                    id="sis-faculty-syllabus-lesson-topics"
                    value={lessonTopics}
                    onChange={(e) => setLessonTopics(e.target.value)}
                    placeholder="Intro, syllabus review"
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

          <div id={ids.faculty.syllabus.lessonsList}>
            <DataTable
              rows={syllabusData.syllabus.lessons}
              rowKey={(lesson) => lesson.id}
              emptyMessage="No lessons yet."
              columns={[
                { key: 'week', header: 'Week', cell: (lesson) => lesson.week },
                { key: 'title', header: 'Title', cell: (lesson) => lesson.title },
                {
                  key: 'topics',
                  header: 'Topics',
                  cell: (lesson) =>
                    lesson.topics.length ? lesson.topics.join(', ') : '—',
                },
                {
                  key: 'upload',
                  header: 'Upload status',
                  cell: (lesson) =>
                    lesson.files.length > 0 ? (
                      <Badge variant="secondary">{lesson.files.length} file(s)</Badge>
                    ) : (
                      <Badge variant="outline">No PDF</Badge>
                    ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  cell: (lesson) => (
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
                  ),
                },
              ]}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default function FacultySyllabusPage() {
  return (
    <RoleGuard role="faculty">
      <div id={ids.faculty.syllabus.page} className="space-y-8">
        <PageHeader
          titleId={ids.faculty.syllabus.title}
          title="Syllabus & Lessons"
          description="Manage syllabus, topics, and lesson PDF uploads"
        />
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <SyllabusContent />
        </Suspense>
      </div>
    </RoleGuard>
  );
}
