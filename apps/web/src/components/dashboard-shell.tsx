'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LogOut } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { ids, navId } from '@/lib/element-ids';
import type { Role } from '@sis/shared';

interface NavItem {
  href: string;
  label: string;
}

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  student: [
    { href: '/student', label: 'Dashboard' },
    { href: '/student/enrollment', label: 'Enrollment' },
    { href: '/student/grades', label: 'Grades' },
    { href: '/student/attendance', label: 'Attendance' },
    { href: '/student/ai-lessons', label: 'AI Lessons' },
  ],
  faculty: [
    { href: '/faculty', label: 'Dashboard' },
    { href: '/faculty/sections', label: 'Sections' },
    { href: '/faculty/grades', label: 'Grades' },
    { href: '/faculty/attendance', label: 'Attendance' },
    { href: '/faculty/syllabus', label: 'Syllabus & Lessons' },
    { href: '/faculty/ai', label: 'AI Tailoring' },
  ],
  admin: [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/enrollment', label: 'Enrollment' },
    { href: '/admin/subjects', label: 'Subjects' },
    { href: '/admin/reports', label: 'Reports' },
    { href: '/admin/maintenance', label: 'Maintenance' },
    { href: '/admin/emails', label: 'Emails' },
    { href: '/admin/health', label: 'Health' },
  ],
};

export function DashboardShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: Role;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = NAV_BY_ROLE[role];

  return (
    <div id={ids.shell.root} className="min-h-screen bg-background">
      <header id={ids.shell.mobileHeader} className="border-b md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <span id={ids.shell.brand} className="text-sm font-semibold">
            SIS
          </span>
          <Button
            id={ids.shell.menuToggle}
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-screen">
        <aside
          id={ids.shell.sidebar}
          className={cn(
            'fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r bg-background transition-transform md:static md:translate-x-0',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex h-14 shrink-0 items-center border-b px-6">
            <span className="text-sm font-semibold tracking-tight">Student Information System</span>
          </div>
          <nav id={ids.shell.nav} className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                id={navId(item.href)}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent/50',
                  pathname === item.href ? 'bg-accent/50 font-medium' : 'text-muted-foreground',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="shrink-0 border-t p-4">
            <p id={ids.shell.userEmail} className="truncate text-xs text-muted-foreground">
              {user?.email}
            </p>
            <Button
              id={ids.shell.logout}
              variant="ghost"
              size="sm"
              className="mt-2 w-full justify-start"
              onClick={() => logout()}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </aside>

        <main id={ids.shell.main} className="flex-1">
          <div id={ids.shell.content} className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
            <div className="space-y-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
