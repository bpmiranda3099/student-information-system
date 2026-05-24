'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { Subject } from '@sis/shared';

export default function AdminSubjectsPage() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [units, setUnits] = useState(3);

  const { data, isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => apiClient<{ subjects: Subject[] }>('/subjects'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient('/subjects', { method: 'POST', body: { code, title, units } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setCode('');
      setTitle('');
      toast.success('Subject created');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <RoleGuard role="admin">
      <div id={ids.admin.subjects.page}>
        <div>
          <h1 id={ids.admin.subjects.title} className="text-2xl font-semibold tracking-tight">
            Subjects
          </h1>
          <p className="text-sm text-muted-foreground">Manage course catalog</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add subject</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor={ids.admin.subjects.code}>Code</Label>
              <Input id={ids.admin.subjects.code} value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={ids.admin.subjects.titleInput}>Title</Label>
              <Input
                id={ids.admin.subjects.titleInput}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={ids.admin.subjects.units}>Units</Label>
              <Input
                id={ids.admin.subjects.units}
                type="number"
                min={1}
                value={units}
                onChange={(e) => setUnits(Number(e.target.value))}
              />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <Button
                id={ids.admin.subjects.create}
                onClick={() => createMutation.mutate()}
                disabled={!code || !title}
              >
                Create
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <Table id={ids.admin.subjects.table}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Units</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.subjects.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.code}</TableCell>
                      <TableCell>{s.title}</TableCell>
                      <TableCell>{s.units}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
