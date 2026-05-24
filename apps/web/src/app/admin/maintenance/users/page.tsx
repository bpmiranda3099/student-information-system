'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive?: boolean;
};

export default function AdminUserMaintenancePage() {
  const queryClient = useQueryClient();
  const [resetUserId, setResetUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'users'],
    queryFn: () => apiClient<{ users: UserRow[] }>('/auth/users'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient(`/admin/maintenance/users/${id}`, {
        method: 'PATCH',
        body: { isActive },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'users'] });
      toast.success('User updated');
    },
  });

  const resetPassword = useMutation({
    mutationFn: () =>
      apiClient(`/admin/maintenance/users/${resetUserId}/reset-password`, {
        method: 'POST',
        body: { password: newPassword },
      }),
    onSuccess: () => {
      setNewPassword('');
      toast.success('Password reset');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <RoleGuard role="admin">
      <div id={ids.admin.maintenance.users.page} className="space-y-8">
        <PageHeader
          title="User Maintenance"
          description="Directory, activation, and password resets"
          actions={
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/maintenance">Back to maintenance</Link>
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Reset password</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sis-admin-reset-user">User ID</Label>
              <Input
                id="sis-admin-reset-user"
                value={resetUserId}
                onChange={(e) => setResetUserId(e.target.value)}
                placeholder="Paste user ID from table"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sis-admin-reset-password">New password</Label>
              <Input
                id="sis-admin-reset-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button
                onClick={() => resetPassword.mutate()}
                disabled={!resetUserId || newPassword.length < 8}
              >
                Reset password
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <DataTable
                rows={data?.users ?? []}
                rowKey={(u) => u.id}
                emptyMessage="No users found."
                columns={[
                  {
                    key: 'name',
                    header: 'Name',
                    cell: (u) => `${u.lastName}, ${u.firstName}`,
                  },
                  { key: 'email', header: 'Email', cell: (u) => u.email },
                  {
                    key: 'role',
                    header: 'Role',
                    cell: (u) => <Badge variant="secondary">{u.role}</Badge>,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    cell: (u) => (
                      <Badge variant={u.isActive === false ? 'outline' : 'secondary'}>
                        {u.isActive === false ? 'inactive' : 'active'}
                      </Badge>
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    cell: (u) => (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toggleActive.mutate({ id: u.id, isActive: u.isActive === false })
                        }
                      >
                        {u.isActive === false ? 'Activate' : 'Deactivate'}
                      </Button>
                    ),
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
