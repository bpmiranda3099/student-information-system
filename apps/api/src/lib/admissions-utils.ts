import {
  ADMISSION_RESUBMIT_COOLDOWN_MS,
  MAX_ADMISSION_RESUBMITS,
  ONBOARDING_STEPS,
  TERMS_VERSION,
  type AdmissionStatus,
} from '@sis/shared';
import { prisma } from '../lib/prisma.js';

export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const completed = await prisma.onboardingStep.count({ where: { userId } });
  return completed >= ONBOARDING_STEPS.length;
}

export function canEditApplication(status: AdmissionStatus): boolean {
  return status === 'draft' || status === 'denied';
}

export function computeResubmitEligibility(
  status: AdmissionStatus,
  resubmitCount: number,
  reviewedAt: Date | null,
): { canResubmit: boolean; cooldownEndsAt: Date | null } {
  if (status !== 'denied') {
    return { canResubmit: false, cooldownEndsAt: null };
  }
  if (resubmitCount >= MAX_ADMISSION_RESUBMITS) {
    return { canResubmit: false, cooldownEndsAt: null };
  }
  if (!reviewedAt) {
    return { canResubmit: true, cooldownEndsAt: null };
  }
  const cooldownEndsAt = new Date(reviewedAt.getTime() + ADMISSION_RESUBMIT_COOLDOWN_MS);
  return {
    canResubmit: Date.now() >= cooldownEndsAt.getTime(),
    cooldownEndsAt: Date.now() >= cooldownEndsAt.getTime() ? null : cooldownEndsAt,
  };
}

export function assertCanResubmit(
  status: AdmissionStatus,
  resubmitCount: number,
  reviewedAt: Date | null,
): void {
  const { canResubmit, cooldownEndsAt } = computeResubmitEligibility(
    status,
    resubmitCount,
    reviewedAt,
  );
  if (status === 'denied' && resubmitCount >= MAX_ADMISSION_RESUBMITS) {
    throw Object.assign(new Error('Maximum resubmissions reached'), { status: 403 });
  }
  if (status === 'denied' && !canResubmit && cooldownEndsAt) {
    throw Object.assign(new Error('Resubmit cooldown active'), {
      status: 429,
      cooldownEndsAt: cooldownEndsAt.toISOString(),
    });
  }
}

export async function generateStudentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;
  const latest = await prisma.student.findFirst({
    where: { studentNumber: { startsWith: prefix } },
    orderBy: { studentNumber: 'desc' },
  });
  const next = latest ? Number(latest.studentNumber.split('-')[1] ?? 0) + 1 : 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}

export function validateApplicationComplete(enrollee: {
  programId: string | null;
  yearLevel: number;
  user: { firstName: string; lastName: string; phone: string | null; bio: string | null };
  application: { termsVersion: string | null; termsAcceptedAt: Date | null };
}): string | null {
  if (!enrollee.programId) return 'Program is required';
  if (!enrollee.user.phone) return 'Phone number is required';
  if (!enrollee.user.bio) return 'Bio is required';
  if (enrollee.application.termsVersion !== TERMS_VERSION || !enrollee.application.termsAcceptedAt) {
    return 'Terms and conditions must be accepted';
  }
  return null;
}

export { TERMS_VERSION };
