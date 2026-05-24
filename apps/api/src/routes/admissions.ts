import { Router, type Router as RouterType } from 'express';
import {
  updateAdmissionProfileSchema,
  acceptTermsSchema,
  denyAdmissionSchema,
  TERMS_VERSION,
  MAX_ADMISSION_RESUBMITS,
} from '@sis/shared';
import { prisma } from '../lib/prisma.js';
import { routeParam } from '../lib/params.js';
import {
  assertCanResubmit,
  canEditApplication,
  computeResubmitEligibility,
  generateStudentNumber,
  validateApplicationComplete,
} from '../lib/admissions-utils.js';
import {
  sendAdmissionApprovedEmail,
  sendAdmissionDeniedEmail,
  sendAdmissionSubmittedEmail,
} from '../lib/resend.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router: RouterType = Router();

function serializeApplication(app: {
  id: string;
  status: string;
  termsVersion: string | null;
  termsAcceptedAt: Date | null;
  resubmitCount: number;
  denialReason: string | null;
  reviewedAt: Date | null;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: app.id,
    status: app.status,
    termsVersion: app.termsVersion,
    termsAcceptedAt: app.termsAcceptedAt?.toISOString() ?? null,
    resubmitCount: app.resubmitCount,
    denialReason: app.denialReason,
    reviewedAt: app.reviewedAt?.toISOString() ?? null,
    submittedAt: app.submittedAt?.toISOString() ?? null,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  };
}

async function getEnrolleeProfile(userId: string) {
  const enrollee = await prisma.enrollee.findUnique({
    where: { userId },
    include: {
      user: true,
      program: true,
      application: true,
    },
  });
  if (!enrollee || !enrollee.application) return null;

  const { canResubmit, cooldownEndsAt } = computeResubmitEligibility(
    enrollee.application.status,
    enrollee.application.resubmitCount,
    enrollee.application.reviewedAt,
  );

  return {
    id: enrollee.user.id,
    email: enrollee.user.email,
    firstName: enrollee.user.firstName,
    lastName: enrollee.user.lastName,
    bio: enrollee.user.bio,
    phone: enrollee.user.phone,
    programId: enrollee.programId,
    programCode: enrollee.program?.code ?? null,
    programName: enrollee.program?.name ?? null,
    yearLevel: enrollee.yearLevel,
    admissionType: enrollee.admissionType,
    address: enrollee.address,
    birthDate: enrollee.birthDate?.toISOString().slice(0, 10) ?? null,
    guardianName: enrollee.guardianName,
    guardianPhone: enrollee.guardianPhone,
    application: serializeApplication(enrollee.application),
    canEdit: canEditApplication(enrollee.application.status),
    canResubmit,
    resubmitCooldownEndsAt: cooldownEndsAt?.toISOString() ?? null,
  };
}

router.get('/admissions/me', authenticate, authorize('enrollee'), async (req, res, next) => {
  try {
    const profile = await getEnrolleeProfile(req.user!.userId);
    if (!profile) {
      res.status(404).json({ error: 'Enrollee profile not found' });
      return;
    }
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/admissions/me',
  authenticate,
  authorize('enrollee'),
  validateBody(updateAdmissionProfileSchema),
  async (req, res, next) => {
    try {
      const enrollee = await prisma.enrollee.findUnique({
        where: { userId: req.user!.userId },
        include: { application: true },
      });
      if (!enrollee?.application) {
        res.status(404).json({ error: 'Enrollee not found' });
        return;
      }
      if (!canEditApplication(enrollee.application.status)) {
        res.status(403).json({ error: 'Application cannot be edited in current status' });
        return;
      }

      const {
        firstName,
        lastName,
        bio,
        phone,
        programId,
        yearLevel,
        admissionType,
        address,
        birthDate,
        guardianName,
        guardianPhone,
      } = req.body;

      await prisma.$transaction(async (tx) => {
        if (firstName || lastName || bio !== undefined || phone !== undefined) {
          await tx.user.update({
            where: { id: req.user!.userId },
            data: {
              ...(firstName ? { firstName } : {}),
              ...(lastName ? { lastName } : {}),
              ...(bio !== undefined ? { bio } : {}),
              ...(phone !== undefined ? { phone } : {}),
            },
          });
        }
        await tx.enrollee.update({
          where: { id: enrollee.id },
          data: {
            ...(programId ? { programId } : {}),
            ...(yearLevel ? { yearLevel } : {}),
            ...(admissionType ? { admissionType } : {}),
            ...(address !== undefined ? { address } : {}),
            ...(birthDate ? { birthDate: new Date(birthDate) } : {}),
            ...(guardianName !== undefined ? { guardianName } : {}),
            ...(guardianPhone !== undefined ? { guardianPhone } : {}),
          },
        });
      });

      const profile = await getEnrolleeProfile(req.user!.userId);
      res.json({ profile });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/admissions/me/accept-terms',
  authenticate,
  authorize('enrollee'),
  validateBody(acceptTermsSchema),
  async (req, res, next) => {
    try {
      const enrollee = await prisma.enrollee.findUnique({
        where: { userId: req.user!.userId },
        include: { application: true },
      });
      if (!enrollee?.application) {
        res.status(404).json({ error: 'Enrollee not found' });
        return;
      }
      if (!canEditApplication(enrollee.application.status)) {
        res.status(403).json({ error: 'Application cannot be edited' });
        return;
      }
      if (req.body.termsVersion !== TERMS_VERSION) {
        res.status(400).json({ error: 'Invalid terms version' });
        return;
      }

      await prisma.admissionApplication.update({
        where: { id: enrollee.application.id },
        data: { termsVersion: TERMS_VERSION, termsAcceptedAt: new Date() },
      });

      const profile = await getEnrolleeProfile(req.user!.userId);
      res.json({ profile });
    } catch (err) {
      next(err);
    }
  },
);

router.post('/admissions/me/submit', authenticate, authorize('enrollee'), async (req, res, next) => {
  try {
    const enrollee = await prisma.enrollee.findUnique({
      where: { userId: req.user!.userId },
      include: { user: true, application: true },
    });
    if (!enrollee?.application) {
      res.status(404).json({ error: 'Enrollee not found' });
      return;
    }

    const app = enrollee.application;
    if (!canEditApplication(app.status)) {
      res.status(403).json({ error: 'Application cannot be submitted in current status' });
      return;
    }

    if (app.status === 'denied') {
      try {
        assertCanResubmit(app.status, app.resubmitCount, app.reviewedAt);
      } catch (err) {
        const e = err as Error & { status?: number; cooldownEndsAt?: string };
        res.status(e.status ?? 403).json({
          error: e.message,
          cooldownEndsAt: e.cooldownEndsAt,
        });
        return;
      }
    }

    const validationError = validateApplicationComplete({
      programId: enrollee.programId,
      yearLevel: enrollee.yearLevel,
      user: enrollee.user,
      application: app,
    });
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const isResubmit = app.status === 'denied';
    await prisma.admissionApplication.update({
      where: { id: app.id },
      data: {
        status: 'submitted',
        submittedAt: new Date(),
        denialReason: null,
        reviewedAt: null,
        reviewedById: null,
        ...(isResubmit ? { resubmitCount: app.resubmitCount + 1 } : {}),
      },
    });

    void sendAdmissionSubmittedEmail(
      enrollee.user.email,
      `${enrollee.user.firstName} ${enrollee.user.lastName}`,
    ).catch(console.error);

    const profile = await getEnrolleeProfile(req.user!.userId);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

router.get('/admin/admissions', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const applications = await prisma.admissionApplication.findMany({
      where: status ? { status: status as never } : {},
      include: {
        enrollee: {
          include: { user: true, program: true },
        },
        reviewedBy: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({
      applications: applications.map((a) => ({
        ...serializeApplication(a),
        enrollee: {
          id: a.enrollee.id,
          firstName: a.enrollee.user.firstName,
          lastName: a.enrollee.user.lastName,
          email: a.enrollee.user.email,
          programCode: a.enrollee.program?.code ?? null,
          programName: a.enrollee.program?.name ?? null,
          yearLevel: a.enrollee.yearLevel,
          admissionType: a.enrollee.admissionType,
        },
        reviewedByName: a.reviewedBy
          ? `${a.reviewedBy.firstName} ${a.reviewedBy.lastName}`
          : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/admin/admissions/:id/approve',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const appId = routeParam(req.params.id);
      const application = await prisma.admissionApplication.findUnique({
        where: { id: appId },
        include: { enrollee: { include: { user: true } } },
      });
      if (!application) {
        res.status(404).json({ error: 'Application not found' });
        return;
      }
      if (!['submitted', 'under_review'].includes(application.status)) {
        res.status(400).json({ error: 'Application is not pending review' });
        return;
      }
      if (!application.enrollee.programId) {
        res.status(400).json({ error: 'Enrollee has no program assigned' });
        return;
      }

      const studentNumber = await generateStudentNumber();
      const userId = application.enrollee.userId;

      await prisma.$transaction(async (tx) => {
        await tx.admissionApplication.update({
          where: { id: appId },
          data: {
            status: 'accepted',
            reviewedById: req.user!.userId,
            reviewedAt: new Date(),
          },
        });
        await tx.user.update({ where: { id: userId }, data: { role: 'student' } });
        await tx.student.create({
          data: {
            userId,
            studentNumber,
            programId: application.enrollee.programId!,
            yearLevel: application.enrollee.yearLevel,
          },
        });
      });
      void sendAdmissionApprovedEmail(
        application.enrollee.user.email,
        `${application.enrollee.user.firstName} ${application.enrollee.user.lastName}`,
      ).catch(console.error);

      res.json({ message: 'Application approved', studentNumber });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/admin/admissions/:id/deny',
  authenticate,
  authorize('admin'),
  validateBody(denyAdmissionSchema),
  async (req, res, next) => {
    try {
      const appId = routeParam(req.params.id);
      const application = await prisma.admissionApplication.findUnique({
        where: { id: appId },
        include: { enrollee: { include: { user: true } } },
      });
      if (!application) {
        res.status(404).json({ error: 'Application not found' });
        return;
      }
      if (!['submitted', 'under_review'].includes(application.status)) {
        res.status(400).json({ error: 'Application is not pending review' });
        return;
      }

      const newStatus =
        application.resubmitCount >= MAX_ADMISSION_RESUBMITS - 1 ? 'closed' : 'denied';

      await prisma.admissionApplication.update({
        where: { id: appId },
        data: {
          status: newStatus,
          denialReason: req.body.reason,
          reviewedById: req.user!.userId,
          reviewedAt: new Date(),
        },
      });

      void sendAdmissionDeniedEmail(
        application.enrollee.user.email,
        `${application.enrollee.user.firstName} ${application.enrollee.user.lastName}`,
        req.body.reason,
      ).catch(console.error);

      res.json({ message: 'Application denied' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
