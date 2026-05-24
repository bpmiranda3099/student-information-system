'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { CourseSection, Enrollment } from '@sis/shared';

export default function StudentEnrollmentPage() {
  const queryClient = useQueryClient();

  const { data: sections, isLoading } = useQuery({
    queryKey: ['sections'],
    queryFn: () => apiClient<{ sections: CourseSection[] }>('/sections'),
  });

  const { data: enrollments } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => apiClient<{ enrollments: Enrollment[] }>('/enrollments'),
  });

  const enrollMutation = useMutation({
    mutationFn: (sectionId: string) =>
      apiClient('/enrollments', { method: 'POST', body: { sectionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success('Enrollment request submitted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <RoleGuard role="student">
      <div id={ids.student.enrollment.page}>
        <div>
          <h1 id={ids.student.enrollment.title} className="text-2xl font-semibold tracking-tight">
            Enrollment
          </h1>
          <p className="text-sm text-muted-foreground">Browse and request section enrollment</p>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : sections?.sections.length === 0 ? (
          <div
            id={ids.student.enrollment.empty}
            className="flex flex-col items-center justify-center gap-4 py-16 text-center"
          >
            <p className="text-sm text-muted-foreground">No sections available.</p>
          </div>
        ) : (
          <div id={ids.student.enrollment.list} className="space-y-4">
            {sections?.sections.map((section) => {
              const enrollment = enrollments?.enrollments.find((e) => e.sectionId === section.id);
              return (
                <Card key={section.id} id={ids.student.enrollment.sectionCard(section.id)}>
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                      <CardTitle>
                        {section.subject?.code} — Section {section.sectionCode}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{section.subject?.title}</p>
                    </div>
                    {enrollment ? (
                      <Badge variant="secondary">{enrollment.status}</Badge>
                    ) : (
                      <Button
                        id={ids.student.enrollment.enrollButton(section.id)}
                        size="sm"
                        disabled={section.enrolledCount >= section.capacity || enrollMutation.isPending}
                        onClick={() => enrollMutation.mutate(section.id)}
                      >
                        Enroll
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {section.schedule} · {section.room} · {section.enrolledCount}/{section.capacity} seats
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
