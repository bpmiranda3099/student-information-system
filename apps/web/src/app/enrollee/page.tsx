'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import type { EnrolleeProfile } from '@sis/shared';

export default function EnrolleeDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admissions', 'me'],
    queryFn: () => apiClient<{ profile: EnrolleeProfile }>('/admissions/me'),
  });

  const profile = data?.profile;
  const app = profile?.application;

  return (
    <RoleGuard role="enrollee">
      <div className="space-y-8">
        <PageHeader
          title="Application status"
          description="Track your admission application"
        />

        {isLoading || !profile ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Current status</CardTitle>
                <Badge variant="secondary">{app?.status.replace('_', ' ')}</Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {app?.submittedAt && (
                  <p>Submitted: {new Date(app.submittedAt).toLocaleString()}</p>
                )}
                {app?.denialReason && (
                  <p className="text-destructive">Denial reason: {app.denialReason}</p>
                )}
                {app?.status === 'denied' && !profile.canResubmit && (
                  <p className="text-muted-foreground">
                    {profile.resubmitCooldownEndsAt
                      ? `You can resubmit after ${new Date(profile.resubmitCooldownEndsAt).toLocaleString()}`
                      : 'Maximum resubmissions reached'}
                  </p>
                )}
                {(app?.status === 'draft' || (app?.status === 'denied' && profile.canResubmit)) && (
                  <Button asChild>
                    <Link href="/enrollee/apply">
                      {app?.status === 'denied' ? 'Revise application' : 'Continue application'}
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Application summary</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                <p>Program: {profile.programName ?? 'Not set'}</p>
                <p>Year level: {profile.yearLevel}</p>
                <p>Type: {profile.admissionType}</p>
                <p>Resubmissions: {app?.resubmitCount ?? 0}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
