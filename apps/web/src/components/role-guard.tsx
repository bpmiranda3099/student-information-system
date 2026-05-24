'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { DashboardShell } from '@/components/dashboard-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { ids } from '@/lib/element-ids';
import type { Role } from '@sis/shared';

export function RoleGuard({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (user?.role !== role) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, role, router]);

  if (isLoading || !user || user.role !== role) {
    return (
      <div id={ids.roleGuard.loading} className="flex min-h-screen items-center justify-center">
        <Skeleton id={`${ids.roleGuard.loading}-skeleton`} className="h-8 w-48" />
      </div>
    );
  }

  return <DashboardShell role={role}>{children}</DashboardShell>;
}
