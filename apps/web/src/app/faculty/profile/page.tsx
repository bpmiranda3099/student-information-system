'use client';

import { RoleGuard } from '@/components/role-guard';
import { ProfilePageContent } from '@/components/profile-page-content';
import { ids } from '@/lib/element-ids';

export default function FacultyProfilePage() {
  return (
    <RoleGuard role="faculty">
      <ProfilePageContent
        pageId={ids.faculty.profile.page}
        titleId={ids.faculty.profile.title}
      />
    </RoleGuard>
  );
}
