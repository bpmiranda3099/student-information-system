'use client';

import { useEffect, useState } from 'react';
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
import { TERMS_VERSION, type EnrolleeProfile, type Program } from '@sis/shared';

const STEPS = ['Bio', 'Program', 'Terms', 'Review'] as const;

export default function EnrolleeApplyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [form, setForm] = useState({
    bio: '',
    phone: '',
    programId: '',
    yearLevel: 1,
    admissionType: 'freshman' as 'freshman' | 'transferee',
    address: '',
    birthDate: '',
    guardianName: '',
    guardianPhone: '',
  });

  const { data: profileData } = useQuery({
    queryKey: ['admissions', 'me'],
    queryFn: () => apiClient<{ profile: EnrolleeProfile }>('/admissions/me'),
  });

  const { data: programsData } = useQuery({
    queryKey: ['programs'],
    queryFn: () => apiClient<{ programs: Program[] }>('/programs'),
  });

  useEffect(() => {
    const p = profileData?.profile;
    if (!p) return;
    if (!p.canEdit && p.application.status !== 'draft') {
      router.replace('/enrollee');
      return;
    }
    setForm({
      bio: p.bio ?? '',
      phone: p.phone ?? '',
      programId: p.programId ?? '',
      yearLevel: p.yearLevel,
      admissionType: p.admissionType,
      address: p.address ?? '',
      birthDate: p.birthDate ?? '',
      guardianName: p.guardianName ?? '',
      guardianPhone: p.guardianPhone ?? '',
    });
    setTermsAccepted(!!p.application.termsAcceptedAt);
  }, [profileData, router]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient('/admissions/me', {
        method: 'PATCH',
        body: form,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admissions', 'me'] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const acceptTermsMutation = useMutation({
    mutationFn: () =>
      apiClient('/admissions/me/accept-terms', {
        method: 'POST',
        body: { termsVersion: TERMS_VERSION },
      }),
    onSuccess: () => {
      setTermsAccepted(true);
      queryClient.invalidateQueries({ queryKey: ['admissions', 'me'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const submitMutation = useMutation({
    mutationFn: () => apiClient('/admissions/me/submit', { method: 'POST' }),
    onSuccess: () => {
      toast.success('Application submitted');
      router.push('/enrollee');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function nextStep() {
    await saveMutation.mutateAsync();
    if (step === 2 && !termsAccepted) {
      await acceptTermsMutation.mutateAsync();
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <RoleGuard role="enrollee">
      <div className="space-y-8">
        <PageHeader title="Admission application" description={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`} />

        <div className="flex gap-2">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`h-1 flex-1 rounded ${i <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{STEPS[step]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Birth date</Label>
                    <Input
                      type="date"
                      value={form.birthDate}
                      onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Guardian name</Label>
                    <Input
                      value={form.guardianName}
                      onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Guardian phone</Label>
                  <Input
                    value={form.guardianPhone}
                    onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Program</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.programId}
                    onChange={(e) => setForm({ ...form, programId: e.target.value })}
                  >
                    <option value="">Select program</option>
                    {(programsData?.programs ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Year level</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={String(form.yearLevel)}
                    onChange={(e) => setForm({ ...form, yearLevel: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4].map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Admission type</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.admissionType}
                    onChange={(e) =>
                      setForm({ ...form, admissionType: e.target.value as 'freshman' | 'transferee' })
                    }
                  >
                    <option value="freshman">Freshman</option>
                    <option value="transferee">Transferee</option>
                  </select>
                </div>
              </>
            )}

            {step === 2 && (
              <div className="space-y-4 text-sm">
                <p>
                  By checking below, you agree to the institution&apos;s terms and conditions
                  (version {TERMS_VERSION}), including academic policies and data privacy practices.
                </p>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  I accept the terms and conditions
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-2 text-sm">
                <p>Program: {programsData?.programs.find((p) => p.id === form.programId)?.name}</p>
                <p>Year: {form.yearLevel}</p>
                <p>Type: {form.admissionType}</p>
                <p>Phone: {form.phone}</p>
                <p className="text-muted-foreground">Review your details before submitting.</p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                disabled={step === 0}
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => void nextStep()} disabled={saveMutation.isPending}>
                  Next
                </Button>
              ) : (
                <Button
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending || !termsAccepted}
                >
                  Submit application
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
