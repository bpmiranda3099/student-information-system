'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';

type AiRequest = {
  id: string;
  lessonTitle: string;
  status: string;
  weakTopics: string[];
  response: string | null;
  createdAt: string;
};

export default function StudentAiLessonsPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['ai', 'requests'],
    queryFn: () => apiClient<{ requests: AiRequest[] }>('/ai/requests'),
  });

  const filtered = useMemo(() => {
    const requests = data?.requests ?? [];
    if (statusFilter === 'all') return requests;
    return requests.filter((r) => r.status === statusFilter);
  }, [data, statusFilter]);

  return (
    <RoleGuard role="student">
      <div id={ids.student.aiLessons.page} className="space-y-8">
        <PageHeader
          titleId={ids.student.aiLessons.title}
          title="AI Lessons"
          description="Personalized study guides from your faculty"
        />

        <div className="flex flex-wrap gap-2">
          {(['all', 'completed', 'pending', 'failed'] as const).map((status) => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? 'default' : 'outline'}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading lessons…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            id={ids.student.aiLessons.empty}
            title="No tailored lessons yet"
            description="Your faculty can generate personalized lessons based on your performance."
          />
        ) : (
          <div id={ids.student.aiLessons.list} className="space-y-4">
            {filtered.map((req) => (
              <Card key={req.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{req.lessonTitle}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary">{req.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {req.weakTopics.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Focus areas: {req.weakTopics.join(', ')}
                    </p>
                  ) : null}
                  {req.response ? (
                    <details>
                      <summary className="cursor-pointer text-sm font-medium">View full lesson</summary>
                      <div className="prose prose-sm mt-3 max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                        {req.response}
                      </div>
                    </details>
                  ) : (
                    <p className="text-sm text-muted-foreground">Response not available yet.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
