'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { Announcement } from '@sis/shared';

const TABS = ['all', 'news', 'no_classes', 'disaster', 'holiday'] as const;

function NewsContent({ role }: { role: 'student' | 'faculty' }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('all');
  const { data, isLoading } = useQuery({
    queryKey: ['announcements', tab],
    queryFn: () =>
      apiClient<{ announcements: Announcement[] }>(
        tab === 'all' ? '/announcements' : `/announcements?category=${tab}`,
      ),
  });

  return (
    <div
      id={role === 'student' ? ids.student.news.page : ids.faculty.news.page}
      className="space-y-8"
    >
      <PageHeader
        titleId={role === 'student' ? ids.student.news.title : ids.faculty.news.title}
        title="News & Alerts"
        description="School announcements and live hazard updates"
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md border px-3 py-1 text-sm capitalize ${
              tab === t ? 'bg-primary text-primary-foreground' : 'bg-background'
            }`}
          >
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          {data?.announcements.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{item.title}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {item.category.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline">{item.severity}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(item.publishedAt).toLocaleString()}
                  {item.source === 'external' ? ' · External feed' : ''}
                </p>
              </CardContent>
            </Card>
          ))}
          {!data?.announcements.length ? (
            <p className="text-sm text-muted-foreground">No announcements in this category.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function StudentNewsPage() {
  return (
    <RoleGuard role="student">
      <NewsContent role="student" />
    </RoleGuard>
  );
}
