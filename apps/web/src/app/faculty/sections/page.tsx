'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { CourseSection } from '@sis/shared';

export default function FacultySectionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['sections'],
    queryFn: () => apiClient<{ sections: CourseSection[] }>('/sections'),
  });

  const sections = data?.sections ?? [];

  return (
    <RoleGuard role="faculty">
      <div id={ids.faculty.sections.page} className="space-y-8">
        <PageHeader
          titleId={ids.faculty.sections.title}
          title="My Sections"
          description="Sections assigned to you"
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading sections…</p>
        ) : sections.length === 0 ? (
          <EmptyState title="No sections assigned" description="Contact admin to get section assignments." />
        ) : (
          <div id={ids.faculty.sections.list} className="grid gap-4 md:grid-cols-2">
            {sections.map((section) => {
              const fillPct = section.capacity
                ? Math.round((section.enrolledCount / section.capacity) * 100)
                : 0;
              return (
                <Card key={section.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle>
                        {section.subject?.code} — Section {section.sectionCode}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{section.subject?.title}</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/faculty/sections/${section.id}`}>Details</Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      {section.term?.name} · {section.schedule ?? 'No schedule'} · {section.room ?? 'No room'}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${fillPct}%` }} />
                      </div>
                      <span className="text-xs">
                        {section.enrolledCount}/{section.capacity}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/faculty/syllabus?section=${section.id}`}>Syllabus</Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/faculty/grades?section=${section.id}`}>Grades</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
