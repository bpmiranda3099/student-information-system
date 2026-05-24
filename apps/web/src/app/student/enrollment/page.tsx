'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { CourseSection, Enrollment } from '@sis/shared';

export default function StudentEnrollmentPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sections?.sections ?? [];
    return (sections?.sections ?? []).filter((s) => {
      const haystack = `${s.subject?.code} ${s.subject?.title} ${s.sectionCode} ${s.schedule ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [sections, search]);

  const pendingCount = enrollments?.enrollments.filter((e) => e.status === 'pending').length ?? 0;
  const approvedCount = enrollments?.enrollments.filter((e) => e.status === 'approved').length ?? 0;

  return (
    <RoleGuard role="student">
      <div id={ids.student.enrollment.page} className="space-y-8">
        <PageHeader
          titleId={ids.student.enrollment.title}
          title="Enrollment"
          description="Browse and request section enrollment"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Available sections" value={sections?.sections.length ?? 0} isLoading={isLoading} />
          <StatCard label="Approved" value={approvedCount} />
          <StatCard label="Pending" value={pendingCount} />
        </div>

        <Input
          placeholder="Search by code, title, or section…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading sections…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            id={ids.student.enrollment.empty}
            title="No sections match your search"
            description="Try a different keyword or check back later."
          />
        ) : (
          <div id={ids.student.enrollment.list} className="space-y-4">
            {filtered.map((section) => {
              const enrollment = enrollments?.enrollments.find((e) => e.sectionId === section.id);
              const fillPct = section.capacity
                ? Math.round((section.enrolledCount / section.capacity) * 100)
                : 0;
              return (
                <Card key={section.id} id={ids.student.enrollment.sectionCard(section.id)}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
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
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      {section.schedule ?? 'No schedule'} · {section.room ?? 'No room'}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${fillPct}%` }} />
                      </div>
                      <span className="text-xs">
                        {section.enrolledCount}/{section.capacity} seats
                      </span>
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
