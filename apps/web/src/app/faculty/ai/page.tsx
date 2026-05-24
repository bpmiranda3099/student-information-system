'use client';

import { Suspense } from 'react';
import { RoleGuard } from '@/components/role-guard';
import FacultyAiPageContent from './ai-content';

export default function FacultyAiPage() {
  return (
    <RoleGuard role="faculty">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <FacultyAiPageContent />
      </Suspense>
    </RoleGuard>
  );
}
