'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { Announcement } from '@sis/shared';
import { cn } from '@/lib/utils';

export function AnnouncementBanner({ id }: { id?: string }) {
  const { data } = useQuery({
    queryKey: ['announcements', 'feed'],
    queryFn: () =>
      apiClient<{ banner: Announcement | null }>('/announcements/feed'),
    refetchInterval: 5 * 60 * 1000,
  });

  const banner = data?.banner;
  if (!banner) return null;

  return (
    <div
      id={id}
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
        banner.severity === 'critical'
          ? 'border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100'
          : 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-medium">{banner.title}</p>
        <p className="mt-1 line-clamp-2 opacity-90">{banner.body}</p>
      </div>
    </div>
  );
}
