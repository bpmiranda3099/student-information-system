'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import type { OnboardingProgress } from '@sis/shared';

export default function StudentOnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [signedName, setSignedName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding', 'me'],
    queryFn: () => apiClient<OnboardingProgress>('/onboarding/me'),
  });

  const completeMutation = useMutation({
    mutationFn: ({ stepKey, signedName }: { stepKey: string; signedName?: string }) =>
      apiClient(`/onboarding/me/steps/${stepKey}/complete`, {
        method: 'POST',
        body: signedName ? { signedName } : {},
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['onboarding', 'me'] });
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !data) {
    return (
      <RoleGuard role="student" skipOnboardingCheck>
        <p className="text-sm text-muted-foreground">Loading onboarding…</p>
      </RoleGuard>
    );
  }

  const currentIndex = data.steps.findIndex((s) => !s.completed);
  const current = currentIndex >= 0 ? data.steps[currentIndex] : null;
  const content = current
    ? data.content.find((c) => c.key === current.key)
    : null;

  if (data.complete) {
    return (
      <RoleGuard role="student" skipOnboardingCheck>
        <div className="space-y-6">
          <PageHeader title="Onboarding complete" description="You may now access your student portal." />
          <Button onClick={() => router.push('/student/enrollment')}>Build your schedule</Button>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard role="student" skipOnboardingCheck>
      <div className="space-y-8">
        <PageHeader
          title="Student onboarding"
          description={`Step ${currentIndex + 1} of ${data.steps.length}`}
        />

        <div className="flex gap-2">
          {data.steps.map((s, i) => (
            <div
              key={s.key}
              className={`h-1 flex-1 rounded ${s.completed || i === currentIndex ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>

        {content && current && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{content.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap dark:prose-invert">
                {content.body}
              </div>
              {current.key === 'agreement' && (
                <div className="space-y-2">
                  <Label htmlFor="signedName">Type your full name to agree</Label>
                  <Input
                    id="signedName"
                    value={signedName}
                    onChange={(e) => setSignedName(e.target.value)}
                  />
                </div>
              )}
              <Button
                disabled={
                  completeMutation.isPending ||
                  (current.key === 'agreement' && !signedName.trim())
                }
                onClick={async () => {
                  await completeMutation.mutateAsync({
                    stepKey: current.key,
                    signedName: current.key === 'agreement' ? signedName : undefined,
                  });
                  if (currentIndex === data.steps.length - 1) {
                    toast.success('Onboarding complete');
                    router.push('/student/enrollment');
                  }
                }}
              >
                {currentIndex === data.steps.length - 1 ? 'Finish onboarding' : 'Continue'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGuard>
  );
}
