'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { VIOLATION_TYPES } from '@sis/shared';

export default function FacultyConductPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    studentId: '',
    violationType: 'misconduct' as string,
    description: '',
  });

  const { data: students } = useQuery({
    queryKey: ['students-search'],
    queryFn: () => apiClient<{ students: { id: string; name: string }[] }>('/conduct/students'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient('/conduct/reports', {
        method: 'POST',
        body: form,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conduct'] });
      setForm({ studentId: '', violationType: 'misconduct', description: '' });
      toast.success('Report filed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <RoleGuard role="faculty">
      <div className="space-y-8">
        <PageHeader title="Conduct reports" description="Report student violations" />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">File report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.studentId}
                onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              >
                <option value="">Select student</option>
                {(students?.students ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Violation type</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.violationType}
                onChange={(e) => setForm({ ...form, violationType: e.target.value })}
              >
                {VIOLATION_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {v.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.studentId || !form.description || createMutation.isPending}
            >
              Submit report
            </Button>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
