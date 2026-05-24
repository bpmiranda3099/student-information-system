'use client';

import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';

export default function StudentAiLessonsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['ai', 'requests'],
    queryFn: () =>
      apiClient<{
        requests: {
          id: string;
          lessonTitle: string;
          status: string;
          weakTopics: string[];
          response: string | null;
          createdAt: string;
        }[];
      }>('/ai/requests'),
  });

  return (
    <RoleGuard role="student">
      <div id={ids.student.aiLessons.page}>
        <div>
          <h1 id={ids.student.aiLessons.title} className="text-2xl font-semibold tracking-tight">
            AI Lessons
          </h1>
          <p className="text-sm text-muted-foreground">Personalized study guides from your faculty</p>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : data?.requests.length === 0 ? (
          <div
            id={ids.student.aiLessons.empty}
            className="flex flex-col items-center justify-center gap-4 py-16 text-center"
          >
            <p className="text-sm text-muted-foreground">No tailored lessons yet.</p>
          </div>
        ) : (
          <div id={ids.student.aiLessons.list} className="space-y-4">
            {data?.requests.map((req) => (
              <Card key={req.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{req.lessonTitle}</CardTitle>
                  <Badge variant="secondary">{req.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {req.weakTopics.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Focus areas: {req.weakTopics.join(', ')}
                    </p>
                  )}
                  {req.response && (
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {req.response.slice(0, 1500)}
                      {req.response.length > 1500 && '…'}
                    </div>
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
