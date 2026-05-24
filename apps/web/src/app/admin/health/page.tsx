'use client';

import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import { healthCheckSchema, type HealthCheck } from '@sis/shared';

export default function AdminHealthPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient<HealthCheck>('/health', { schema: healthCheckSchema }),
    refetchInterval: 30000,
  });

  const statusVariant = (status: string) => {
    if (status === 'ok' || status === 'healthy') return 'default' as const;
    if (status === 'not_configured') return 'secondary' as const;
    return 'destructive' as const;
  };

  return (
    <RoleGuard role="admin">
      <div id={ids.admin.health.page}>
        <div className="flex items-center justify-between">
          <div>
            <h1 id={ids.admin.health.title} className="text-2xl font-semibold tracking-tight">
              API Health
            </h1>
            <p className="text-sm text-muted-foreground">Monitor system dependencies</p>
          </div>
          <button
            id={ids.admin.health.refresh}
            onClick={() => refetch()}
            className="text-sm text-muted-foreground hover:text-foreground"
            disabled={isFetching}
          >
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : data ? (
          <div className="space-y-4">
            <Card id={ids.admin.health.overall}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Overall Status</CardTitle>
                <Badge variant={statusVariant(data.status)}>{data.status}</Badge>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Version {data.version} · Last checked {new Date(data.timestamp).toLocaleTimeString()}
              </CardContent>
            </Card>

            <div id={ids.admin.health.checksGrid} className="grid gap-4 md:grid-cols-2">
              {Object.entries(data.checks).map(([name, check]) => (
                <Card key={name}>
                  <CardHeader className="flex flex-row items-center justify-between py-4">
                    <CardTitle className="text-base capitalize">{name}</CardTitle>
                    <Badge variant={statusVariant(check.status)}>{check.status}</Badge>
                  </CardHeader>
                  {'latencyMs' in check && check.latencyMs !== undefined && (
                    <CardContent className="pt-0 text-xs text-muted-foreground">
                      Latency: {check.latencyMs}ms
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </RoleGuard>
  );
}
