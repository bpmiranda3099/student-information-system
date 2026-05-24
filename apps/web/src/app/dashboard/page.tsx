'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { ids } from '@/lib/element-ids';

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    const roleRoutes = {
      student: '/student',
      faculty: '/faculty',
      admin: '/admin',
    } as const;
    router.replace(roleRoutes[user!.role]);
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div id={ids.dashboard.redirect} className="flex min-h-screen items-center justify-center">
      <Skeleton id={`${ids.dashboard.redirect}-skeleton`} className="h-8 w-48" />
    </div>
  );
}
