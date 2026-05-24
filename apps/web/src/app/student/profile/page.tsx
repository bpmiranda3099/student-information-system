'use client';

import { RoleGuard } from '@/components/role-guard';
import { ProfilePageContent } from '@/components/profile-page-content';
import { ids } from '@/lib/element-ids';

export default function StudentProfilePage() {
  return (
    <RoleGuard role="student">
      <ProfilePageContent
        pageId={ids.student.profile.page}
        titleId={ids.student.profile.title}
      />
    </RoleGuard>
  );
}
