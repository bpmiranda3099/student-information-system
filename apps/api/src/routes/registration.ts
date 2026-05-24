import { Router, type Router as RouterType } from 'express';
import { scheduleDraftSchema } from '@sis/shared';
import { prisma } from '../lib/prisma.js';
import { serializeSection } from '../lib/serializers.js';
import { findScheduleConflicts } from '../lib/schedule-utils.js';
import { authenticate, authorize, requireOnboardingComplete } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router: RouterType = Router();

async function getStudentOr404(userId: string) {
  return prisma.student.findUnique({
    where: { userId },
    include: { program: true },
  });
}

router.get(
  '/students/me/available-sections',
  authenticate,
  authorize('student'),
  requireOnboardingComplete,
  async (req, res, next) => {
    try {
      const student = await getStudentOr404(req.user!.userId);
      if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      const termId = req.query.termId ? String(req.query.termId) : undefined;
      const activeTerm = termId
        ? await prisma.academicTerm.findUnique({ where: { id: termId } })
        : await prisma.academicTerm.findFirst({ where: { status: 'active' } });

      if (!activeTerm) {
        res.json({ sections: [], term: null });
        return;
      }

      const curriculum = await prisma.programCurriculum.findMany({
        where: { programId: student.programId, yearLevel: student.yearLevel },
      });
      const curriculumMap = new Map(curriculum.map((c) => [c.subjectId, c.requirementType]));

      const sections = await prisma.courseSection.findMany({
        where: { termId: activeTerm.id },
        include: {
          subject: true,
          term: true,
          faculty: { include: { user: true } },
          meetings: true,
          _count: { select: { enrollments: { where: { status: 'approved' } } } },
        },
        orderBy: [{ subject: { code: 'asc' } }, { sectionCode: 'asc' }],
      });

      res.json({
        term: {
          id: activeTerm.id,
          name: activeTerm.name,
          year: activeTerm.year,
          semester: activeTerm.semester,
        },
        sections: sections.map((s) => ({
          ...serializeSection(s),
          requirementType: curriculumMap.get(s.subjectId) ?? null,
          seatsLeft: Math.max(0, s.capacity - s._count.enrollments),
          meetings: s.meetings.map((m) => ({
            id: m.id,
            sectionId: m.sectionId,
            dayOfWeek: m.dayOfWeek,
            startTime: m.startTime,
            endTime: m.endTime,
            room: m.room,
          })),
          facultyName: `${s.faculty.user.firstName} ${s.faculty.user.lastName}`,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/students/me/schedule-draft',
  authenticate,
  authorize('student'),
  requireOnboardingComplete,
  async (req, res, next) => {
    try {
      const student = await getStudentOr404(req.user!.userId);
      if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      const termId = req.query.termId ? String(req.query.termId) : undefined;
      const activeTerm = termId
        ? await prisma.academicTerm.findUnique({ where: { id: termId } })
        : await prisma.academicTerm.findFirst({ where: { status: 'active' } });

      if (!activeTerm) {
        res.json({ draft: { termId: null, sectionIds: [] } });
        return;
      }

      const draft = await prisma.scheduleDraft.findUnique({
        where: { studentId_termId: { studentId: student.id, termId: activeTerm.id } },
      });

      res.json({
        draft: {
          termId: activeTerm.id,
          sectionIds: (draft?.sectionIds as string[] | undefined) ?? [],
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  '/students/me/schedule-draft',
  authenticate,
  authorize('student'),
  requireOnboardingComplete,
  validateBody(scheduleDraftSchema),
  async (req, res, next) => {
    try {
      const student = await getStudentOr404(req.user!.userId);
      if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      const draft = await prisma.scheduleDraft.upsert({
        where: {
          studentId_termId: { studentId: student.id, termId: req.body.termId },
        },
        create: {
          studentId: student.id,
          termId: req.body.termId,
          sectionIds: req.body.sectionIds,
        },
        update: { sectionIds: req.body.sectionIds },
      });

      res.json({
        draft: {
          termId: draft.termId,
          sectionIds: draft.sectionIds as string[],
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/students/me/schedule-submit',
  authenticate,
  authorize('student'),
  requireOnboardingComplete,
  validateBody(scheduleDraftSchema),
  async (req, res, next) => {
    try {
      const student = await getStudentOr404(req.user!.userId);
      if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      const { termId, sectionIds } = req.body;
      if (!sectionIds.length) {
        res.status(400).json({ error: 'Select at least one section' });
        return;
      }

      const sections = await prisma.courseSection.findMany({
        where: { id: { in: sectionIds }, termId },
        include: {
          subject: true,
          meetings: true,
          _count: { select: { enrollments: { where: { status: 'approved' } } } },
        },
      });

      if (sections.length !== sectionIds.length) {
        res.status(400).json({ error: 'One or more sections not found' });
        return;
      }

      const subjectIds = sections.map((s) => s.subjectId);
      if (new Set(subjectIds).size !== subjectIds.length) {
        res.status(400).json({ error: 'Cannot enroll in multiple sections of the same subject' });
        return;
      }

      for (const section of sections) {
        if (section._count.enrollments >= section.capacity) {
          res.status(400).json({ error: `Section ${section.sectionCode} is full` });
          return;
        }
      }

      const conflictInput = sections.map((s) => ({
        sectionId: s.id,
        sectionCode: s.sectionCode,
        meetings: s.meetings,
      }));
      const conflicts = findScheduleConflicts(conflictInput);
      if (conflicts.length) {
        res.status(400).json({ error: 'Schedule conflict detected', conflicts });
        return;
      }

      const curriculum = await prisma.programCurriculum.findMany({
        where: { programId: student.programId, yearLevel: student.yearLevel },
      });
      const curriculumMap = new Map(curriculum.map((c) => [c.subjectId, c.requirementType]));

      const enrollments = await prisma.$transaction(async (tx) => {
        const results = [];
        for (const section of sections) {
          const requirementType = curriculumMap.get(section.subjectId);
          const status = requirementType === 'required' ? 'approved' : 'pending';
          const enrollment = await tx.enrollment.upsert({
            where: { studentId_sectionId: { studentId: student.id, sectionId: section.id } },
            create: { studentId: student.id, sectionId: section.id, status },
            update: { status },
          });
          results.push({ ...enrollment, requirementType: requirementType ?? 'elective' });
        }
        await tx.scheduleDraft.upsert({
          where: { studentId_termId: { studentId: student.id, termId } },
          create: { studentId: student.id, termId, sectionIds },
          update: { sectionIds },
        });
        return results;
      });

      res.json({
        enrollments: enrollments.map((e) => ({
          sectionId: e.sectionId,
          status: e.status,
          requirementType: e.requirementType,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
