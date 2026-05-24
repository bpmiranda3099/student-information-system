'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/role-guard';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { ids } from '@/lib/element-ids';
import type { Program, Subject } from '@sis/shared';

export default function AdminSubjectsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'programs' | 'subjects'>('programs');

  const [programCode, setProgramCode] = useState('');
  const [programName, setProgramName] = useState('');
  const [programDescription, setProgramDescription] = useState('');

  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [units, setUnits] = useState(3);
  const [description, setDescription] = useState('');

  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ['programs'],
    queryFn: () => apiClient<{ programs: Program[] }>('/programs'),
  });

  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => apiClient<{ subjects: Subject[] }>('/subjects'),
  });

  const createProgram = useMutation({
    mutationFn: () =>
      apiClient('/programs', {
        method: 'POST',
        body: {
          code: programCode,
          name: programName,
          description: programDescription || undefined,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      setProgramCode('');
      setProgramName('');
      setProgramDescription('');
      toast.success('Program created');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createSubject = useMutation({
    mutationFn: () =>
      apiClient('/subjects', {
        method: 'POST',
        body: { code, title, units, description: description || undefined },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setCode('');
      setTitle('');
      setDescription('');
      toast.success('Subject created');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <RoleGuard role="admin">
      <div id={ids.admin.subjects.page} className="space-y-8">
        <PageHeader
          titleId={ids.admin.subjects.title}
          title="Catalog"
          description="Manage academic programs and course subjects"
        />

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={tab === 'programs' ? 'default' : 'outline'}
            onClick={() => setTab('programs')}
          >
            Programs ({programs?.programs.length ?? 0})
          </Button>
          <Button
            size="sm"
            variant={tab === 'subjects' ? 'default' : 'outline'}
            onClick={() => setTab('subjects')}
          >
            Subjects ({subjects?.subjects.length ?? 0})
          </Button>
        </div>

        {tab === 'programs' ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Add program</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="sis-admin-catalog-program-code">Code</Label>
                  <Input
                    id="sis-admin-catalog-program-code"
                    value={programCode}
                    onChange={(e) => setProgramCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sis-admin-catalog-program-name">Name</Label>
                  <Input
                    id="sis-admin-catalog-program-name"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="sis-admin-catalog-program-description">Description</Label>
                  <Input
                    id="sis-admin-catalog-program-description"
                    value={programDescription}
                    onChange={(e) => setProgramDescription(e.target.value)}
                    placeholder="Optional program description"
                  />
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <Button
                    onClick={() => createProgram.mutate()}
                    disabled={!programCode || !programName || createProgram.isPending}
                  >
                    Create program
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                {programsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : (
                  <DataTable
                    rows={programs?.programs ?? []}
                    rowKey={(p) => p.id}
                    emptyMessage="No programs yet."
                    columns={[
                      { key: 'code', header: 'Code', cell: (p) => p.code },
                      { key: 'name', header: 'Name', cell: (p) => p.name },
                      {
                        key: 'description',
                        header: 'Description',
                        cell: (p) => p.description ?? '—',
                      },
                    ]}
                  />
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
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
                <div className="space-y-2 md:col-span-4">
                  <Label htmlFor="sis-admin-subjects-description">Description</Label>
                  <Input
                    id="sis-admin-subjects-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional course description"
                  />
                </div>
                <div className="md:col-span-4 flex justify-end">
                  <Button
                    id={ids.admin.subjects.create}
                    onClick={() => createSubject.mutate()}
                    disabled={!code || !title || createSubject.isPending}
                  >
                    Create subject
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                {subjectsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : (
                  <DataTable
                    id={ids.admin.subjects.table}
                    rows={subjects?.subjects ?? []}
                    rowKey={(s) => s.id}
                    emptyMessage="No subjects yet."
                    columns={[
                      { key: 'code', header: 'Code', cell: (s) => s.code },
                      { key: 'title', header: 'Title', cell: (s) => s.title },
                      { key: 'units', header: 'Units', cell: (s) => s.units },
                      {
                        key: 'description',
                        header: 'Description',
                        cell: (s) => s.description ?? '—',
                      },
                    ]}
                  />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
