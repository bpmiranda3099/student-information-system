'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  InteractiveTimetable,
  useScheduleConflicts,
} from '@/components/interactive-timetable';
import { apiClient } from '@/lib/api-client';
import type { AvailableSection, Enrollment } from '@sis/shared';

export default function StudentEnrollmentPage() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [termId, setTermId] = useState<string | null>(null);

  const { data: availableData, isLoading } = useQuery({
    queryKey: ['available-sections'],
    queryFn: () =>
      apiClient<{ sections: AvailableSection[]; term: { id: string; name: string } | null }>(
        '/students/me/available-sections',
      ),
  });

  const { data: draftData } = useQuery({
    queryKey: ['schedule-draft', termId],
    queryFn: () =>
      apiClient<{ draft: { termId: string | null; sectionIds: string[] } }>(
        `/students/me/schedule-draft${termId ? `?termId=${termId}` : ''}`,
      ),
    enabled: !!availableData,
  });

  const { data: enrollments } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => apiClient<{ enrollments: Enrollment[] }>('/enrollments'),
  });

  useEffect(() => {
    if (availableData?.term?.id) setTermId(availableData.term.id);
  }, [availableData?.term?.id]);

  useEffect(() => {
    if (draftData?.draft.sectionIds.length) {
      setSelectedIds(draftData.draft.sectionIds);
    }
  }, [draftData]);

  const sections = availableData?.sections ?? [];
  const conflicts = useScheduleConflicts(sections, selectedIds);

  const saveDraftMutation = useMutation({
    mutationFn: () =>
      apiClient('/students/me/schedule-draft', {
        method: 'PUT',
        body: { termId: termId!, sectionIds: selectedIds },
      }),
    onSuccess: () => toast.success('Draft saved'),
    onError: (err: Error) => toast.error(err.message),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      apiClient('/students/me/schedule-submit', {
        method: 'POST',
        body: { termId: termId!, sectionIds: selectedIds },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success('Schedule submitted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pendingCount = enrollments?.enrollments.filter((e) => e.status === 'pending').length ?? 0;
  const approvedCount = enrollments?.enrollments.filter((e) => e.status === 'approved').length ?? 0;

  return (
    <RoleGuard role="student">
      <div className="space-y-8">
        <PageHeader
          title="Course registration"
          description="Build your timetable — required subjects auto-approve; electives need admin approval"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Available sections" value={sections.length} isLoading={isLoading} />
          <StatCard label="Approved" value={approvedCount} />
          <StatCard label="Pending electives" value={pendingCount} />
        </div>

        {availableData?.term && (
          <p className="text-sm text-muted-foreground">Term: {availableData.term.name}</p>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading sections…</p>
        ) : (
          <>
            <InteractiveTimetable
              available={sections}
              selectedIds={selectedIds}
              onSelectedChange={setSelectedIds}
              conflicts={conflicts}
            />
            {conflicts.length > 0 && (
              <p className="text-sm text-destructive">Time conflict detected — adjust your selection.</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!termId || saveDraftMutation.isPending}
                onClick={() => saveDraftMutation.mutate()}
              >
                Save draft
              </Button>
              <Button
                disabled={!termId || !!conflicts.length || submitMutation.isPending || !selectedIds.length}
                onClick={() => submitMutation.mutate()}
              >
                Submit schedule
              </Button>
            </div>
          </>
        )}

        {(enrollments?.enrollments.length ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your enrollments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {enrollments?.enrollments.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <span>
                    {e.section?.subject?.code} — {e.section?.sectionCode}
                  </span>
                  <Badge variant="secondary">{e.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGuard>
  );
}
