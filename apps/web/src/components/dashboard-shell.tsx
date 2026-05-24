'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  LogOut,
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  GraduationCap,
  CalendarCheck,
  Sparkles,
  Users,
  FileBarChart,
  Library,
  Wrench,
  Mail,
  HeartPulse,
  UserPlus,
  User,
  Calendar,
  Clock,
  Megaphone,
  Settings,
  FileText,
  LifeBuoy,
  AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { ids, navId } from '@/lib/element-ids';
import type { Role } from '@sis/shared';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

const NAV_BY_ROLE: Record<Role, NavGroup[]> = {
  enrollee: [
    {
      section: 'Application',
      items: [
        { href: '/enrollee', label: 'Status', icon: LayoutDashboard },
        { href: '/enrollee/apply', label: 'Apply', icon: FileText },
      ],
    },
    {
      section: 'Support',
      items: [{ href: '/help', label: 'Help Desk', icon: LifeBuoy }],
    },
  ],
  student: [
    {
      section: 'Overview',
      items: [
        { href: '/student', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/student/courses', label: 'My Courses', icon: BookOpen },
        { href: '/student/profile', label: 'Profile', icon: User },
      ],
    },
    {
      section: 'Academics',
      items: [
        { href: '/student/enrollment', label: 'Enrollment', icon: UserPlus },
        { href: '/student/schedule', label: 'Schedule', icon: Clock },
        { href: '/student/grades', label: 'Grades', icon: GraduationCap },
        { href: '/student/attendance', label: 'Attendance', icon: CalendarCheck },
      ],
    },
    {
      section: 'Support',
      items: [
        { href: '/student/ai-lessons', label: 'AI Lessons', icon: Sparkles },
        { href: '/student/news', label: 'News & Alerts', icon: Megaphone },
        { href: '/help', label: 'Help Desk', icon: LifeBuoy },
      ],
    },
  ],
  faculty: [
    {
      section: 'Overview',
      items: [
        { href: '/faculty', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/faculty/profile', label: 'Profile', icon: User },
      ],
    },
    {
      section: 'Teaching',
      items: [
        { href: '/faculty/sections', label: 'Sections', icon: BookOpen },
        { href: '/faculty/schedule', label: 'Schedule', icon: Clock },
        { href: '/faculty/grades', label: 'Grades', icon: GraduationCap },
        { href: '/faculty/attendance', label: 'Attendance', icon: CalendarCheck },
        { href: '/faculty/syllabus', label: 'Syllabus & Lessons', icon: ClipboardList },
        { href: '/faculty/conduct', label: 'Conduct Reports', icon: AlertTriangle },
      ],
    },
    {
      section: 'Tools',
      items: [
        { href: '/faculty/ai', label: 'AI Tailoring', icon: Sparkles },
        { href: '/faculty/news', label: 'News & Alerts', icon: Megaphone },
        { href: '/help', label: 'Help Desk', icon: LifeBuoy },
      ],
    },
  ],
  admin: [
    {
      section: 'Overview',
      items: [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      section: 'Catalog',
      items: [{ href: '/admin/subjects', label: 'Catalog', icon: Library }],
    },
    {
      section: 'Operations',
      items: [
        { href: '/admin/admissions', label: 'Admissions', icon: FileText },
        { href: '/admin/enrollment', label: 'Enrollment', icon: Users },
        { href: '/admin/conduct', label: 'Conduct', icon: AlertTriangle },
        { href: '/admin/support', label: 'Help Desk', icon: LifeBuoy },
        { href: '/admin/calendar', label: 'Calendar', icon: Calendar },
        { href: '/admin/reports', label: 'Reports', icon: FileBarChart },
        { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
        { href: '/admin/academic-setup', label: 'Academic Setup', icon: Settings },
      ],
    },
    {
      section: 'System',
      items: [
        { href: '/admin/maintenance', label: 'Maintenance', icon: Wrench },
        { href: '/admin/emails', label: 'Emails', icon: Mail },
        { href: '/admin/health', label: 'Health', icon: HeartPulse },
      ],
    },
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  student: 'Student',
  faculty: 'Faculty',
  admin: 'Admin',
  enrollee: 'Enrollee',
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
  const navGroups = NAV_BY_ROLE[role];

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
            'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-background transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex shrink-0 flex-col gap-2 border-b px-5 py-4">
            <span className="text-sm font-semibold tracking-tight">Student Information System</span>
            <Badge variant="secondary" className="w-fit capitalize">
              {ROLE_LABELS[role]}
            </Badge>
          </div>
          <nav id={ids.shell.nav} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
            {navGroups.map((group) => (
              <div key={group.section} className="space-y-1">
                <p className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.section}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      id={navId(item.href)}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent/50',
                        active ? 'bg-accent/50 font-medium text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
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

        <main id={ids.shell.main} className="min-w-0 flex-1">
          <div id={ids.shell.content} className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
            <div className="space-y-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
