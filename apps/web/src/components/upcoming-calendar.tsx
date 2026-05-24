'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AcademicCalendarEvent } from '@sis/shared';

export function UpcomingCalendar({ id }: { id?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['calendar', 'upcoming'],
    queryFn: () => apiClient<{ events: AcademicCalendarEvent[] }>('/calendar/upcoming'),
  });

  return (
    <Card id={id}>
      <CardHeader>
        <CardTitle className="text-base">Upcoming calendar</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data?.events.length ? (
          <p className="text-sm text-muted-foreground">No events in the next two weeks.</p>
        ) : (
          <ul className="space-y-3">
            {data.events.map((event) => (
              <li key={event.id} className="flex items-start justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.startDate}
                    {event.endDate !== event.startDate ? ` – ${event.endDate}` : ''}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 capitalize">
                  {event.type.replace('_', ' ')}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
