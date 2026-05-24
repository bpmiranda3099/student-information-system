'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { RoleGuard } from '@/components/role-guard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { CourseSection } from '@sis/shared';

export default function FacultySectionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['sections'],
    queryFn: () => apiClient<{ sections: CourseSection[] }>('/sections'),
  });

  return (
    <RoleGuard role="faculty">
      <div id={ids.faculty.sections.page}>
        <div>
          <h1 id={ids.faculty.sections.title} className="text-2xl font-semibold tracking-tight">
            My Sections
          </h1>
          <p className="text-sm text-muted-foreground">Sections assigned to you</p>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div id={ids.faculty.sections.list} className="space-y-4">
            {data?.sections.map((section) => (
              <Card key={section.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>
                      {section.subject?.code} — Section {section.sectionCode}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{section.subject?.title}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/faculty/syllabus?section=${section.id}`}>Syllabus</Link>
                  </Button>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {section.schedule} · {section.enrolledCount}/{section.capacity} enrolled
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
