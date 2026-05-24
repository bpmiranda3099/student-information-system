'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { IdCard } from '@/components/id-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient, apiUpload } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import type { Profile } from '@sis/shared';

export function ProfilePageContent({
  titleId,
  pageId,
}: {
  titleId: string;
  pageId: string;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => apiClient<{ profile: Profile }>('/profiles/me'),
  });

  const { data: conductData } = useQuery({
    queryKey: ['conduct', 'me'],
    queryFn: () => apiClient<{ summary?: { openCount: number } }>('/conduct/reports'),
    enabled: data?.profile?.role === 'student',
  });

  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (data?.profile) {
      setBio(data.profile.bio ?? '');
      setPhone(data.profile.phone ?? '');
    }
  }, [data?.profile]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient('/profiles/me', {
        method: 'PATCH',
        body: { bio, phone },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      toast.success('Profile updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function onPhotoChange(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await apiUpload('/profiles/me/photo', formData);
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      toast.success('Photo updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  const profile = data?.profile;

  return (
    <div id={pageId} className="space-y-8">
      <PageHeader titleId={titleId} title="Profile" description="Your bio and digital ID card" />

      {conductData?.summary && conductData.summary.openCount > 0 && (
        <Badge variant="destructive">
          Conduct status: {conductData.summary.openCount} open report(s)
        </Badge>
      )}

      {isLoading || !profile ? (
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <IdCard profile={profile} className="max-w-md" />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Edit profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sis-profile-photo">Profile photo</Label>
                <Input
                  id="sis-profile-photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onPhotoChange(file);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sis-profile-bio">Bio</Label>
                <Input
                  id="sis-profile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Short introduction"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sis-profile-phone">Phone</Label>
                <Input
                  id="sis-profile-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+63 …"
                />
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                Save changes
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
