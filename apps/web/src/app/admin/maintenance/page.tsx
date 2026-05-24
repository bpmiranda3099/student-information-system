'use client';

import Link from 'next/link';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ids } from '@/lib/element-ids';

export default function AdminMaintenanceHubPage() {
  return (
    <RoleGuard role="admin">
      <div id={ids.admin.maintenance.page} className="space-y-8">
        <PageHeader
          titleId={ids.admin.maintenance.title}
          title="Maintenance"
          description="User and data maintenance modules"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>User Maintenance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Manage accounts, roles, activation status, and password resets.
              </p>
              <Button asChild>
                <Link href="/admin/maintenance/users">Open user maintenance</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Maintenance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Export enrollments, review orphan records, and view system jobs.
              </p>
              <Button asChild variant="outline">
                <Link href="/admin/maintenance/data">Open data maintenance</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}
