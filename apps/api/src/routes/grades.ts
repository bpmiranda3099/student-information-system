import { Router, type Router as RouterType } from 'express';
import {
  createGradeSchemeSchema,
  createGradeComponentSchema,
  upsertGradeEntrySchema,
  computeGrade,
  type GradeComponentType,
} from '@sis/shared';
import { prisma } from '../lib/prisma.js';
import { routeParam } from '../lib/params.js';
import { sendGradePostedEmail } from '../lib/resend.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router: RouterType = Router();

async function getSectionGrades(sectionId: string, studentId?: string) {
  const scheme = await prisma.gradeScheme.findUnique({
    where: { sectionId },
    include: { components: { orderBy: { sequence: 'asc' } } },
  });
  if (!scheme) return null;

  const enrollments = await prisma.enrollment.findMany({
    where: { sectionId, status: 'approved', ...(studentId ? { studentId } : {}) },
    include: { student: { include: { user: true } } },
  });

  const studentIds = enrollments.map((e) => e.studentId);
  const entries = await prisma.gradeEntry.findMany({
    where: { studentId: { in: studentIds }, component: { schemeId: scheme.id } },
  });

  const categoryWeights = scheme.categoryWeights as { type: GradeComponentType; weight: number }[];
  const components = scheme.components.map((c) => ({
    id: c.id,
    type: c.type as GradeComponentType,
    maxScore: c.maxScore,
    topicTags: c.topicTags as string[],
  }));

  const grades = enrollments.map((enrollment) => {
    const studentEntries = entries
      .filter((e) => e.studentId === enrollment.studentId)
      .map((e) => ({ componentId: e.componentId, score: e.score }));

    const computed = computeGrade({
      studentId: enrollment.studentId,
      sectionId,
      components,
      entries: studentEntries,
      categoryWeights,
      extracurricularMax: scheme.extracurricularMax,
    });

    return {
      ...computed,
      studentName: `${enrollment.student.user.firstName} ${enrollment.student.user.lastName}`,
      entries: studentEntries,
    };
  });

  return { scheme, components: scheme.components, grades };
}

router.get('/sections/:sectionId/grade-scheme', authenticate, async (req, res, next) => {
  try {
    const scheme = await prisma.gradeScheme.findUnique({
      where: { sectionId: routeParam(req.params.sectionId) },
      include: { components: { orderBy: { sequence: 'asc' } } },
    });
    if (!scheme) {
      res.json({ scheme: null, components: [] });
      return;
    }
    res.json({
      scheme: {
        id: scheme.id,
        sectionId: scheme.sectionId,
        isLocked: scheme.isLocked,
        extracurricularMax: scheme.extracurricularMax,
        categoryWeights: scheme.categoryWeights,
        createdAt: scheme.createdAt.toISOString(),
      },
      components: scheme.components.map((c) => ({
        id: c.id,
        schemeId: c.schemeId,
        type: c.type,
        name: c.name,
        maxScore: c.maxScore,
        sequence: c.sequence,
        topicTags: c.topicTags as string[],
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/sections/:sectionId/grade-scheme',
  authenticate,
  authorize('faculty', 'admin'),
  validateBody(createGradeSchemeSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.gradeScheme.findUnique({
        where: { sectionId: routeParam(req.params.sectionId) },
      });
      if (existing?.isLocked) {
        res.status(400).json({ error: 'Grade scheme is locked' });
        return;
      }

      const scheme = await prisma.gradeScheme.upsert({
        where: { sectionId: routeParam(req.params.sectionId) },
        create: {
          sectionId: routeParam(req.params.sectionId),
          categoryWeights: req.body.categoryWeights,
          extracurricularMax: req.body.extracurricularMax ?? 5,
        },
        update: {
          categoryWeights: req.body.categoryWeights,
          extracurricularMax: req.body.extracurricularMax ?? 5,
        },
      });

      res.json({
        scheme: {
          id: scheme.id,
          sectionId: scheme.sectionId,
          isLocked: scheme.isLocked,
          extracurricularMax: scheme.extracurricularMax,
          categoryWeights: scheme.categoryWeights,
          createdAt: scheme.createdAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/sections/:sectionId/grade-components',
  authenticate,
  authorize('faculty', 'admin'),
  validateBody(createGradeComponentSchema),
  async (req, res, next) => {
    try {
      const scheme = await prisma.gradeScheme.findUnique({
        where: { sectionId: routeParam(req.params.sectionId) },
      });
      if (!scheme) {
        res.status(400).json({ error: 'Create grade scheme first' });
        return;
      }
      if (scheme.isLocked) {
        res.status(400).json({ error: 'Grade scheme is locked' });
        return;
      }

      const component = await prisma.gradeComponent.create({
        data: {
          schemeId: scheme.id,
          type: req.body.type,
          name: req.body.name,
          maxScore: req.body.maxScore,
          sequence: req.body.sequence ?? 0,
          topicTags: req.body.topicTags ?? [],
        },
      });

      res.status(201).json({
        component: {
          id: component.id,
          schemeId: component.schemeId,
          type: component.type,
          name: component.name,
          maxScore: component.maxScore,
          sequence: component.sequence,
          topicTags: component.topicTags as string[],
          createdAt: component.createdAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/sections/:sectionId/grades',
  authenticate,
  authorize('faculty', 'admin'),
  validateBody(upsertGradeEntrySchema),
  async (req, res, next) => {
    try {
      const { studentId, componentId, score } = req.body;

      const component = await prisma.gradeComponent.findUnique({
        where: { id: componentId },
        include: { scheme: true },
      });
      if (!component || component.scheme.sectionId !== routeParam(req.params.sectionId)) {
        res.status(404).json({ error: 'Component not found' });
        return;
      }
      if (score > component.maxScore) {
        res.status(400).json({ error: 'Score exceeds max score' });
        return;
      }

      const entry = await prisma.gradeEntry.upsert({
        where: { studentId_componentId: { studentId, componentId } },
        create: { studentId, componentId, score },
        update: { score },
      });

      if (!component.scheme.isLocked) {
        const entryCount = await prisma.gradeEntry.count({
          where: { component: { schemeId: component.schemeId } },
        });
        if (entryCount > 0) {
          await prisma.gradeScheme.update({
            where: { id: component.schemeId },
            data: { isLocked: true },
          });
        }
      }

      res.json({
        entry: {
          id: entry.id,
          studentId: entry.studentId,
          componentId: entry.componentId,
          score: entry.score,
          recordedAt: entry.recordedAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/sections/:sectionId/grades', authenticate, async (req, res, next) => {
  try {
    const result = await getSectionGrades(routeParam(req.params.sectionId));
    if (!result) {
      res.json({ grades: [], components: [], scheme: null });
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/students/me/grades', authenticate, authorize('student'), async (req, res, next) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
    if (!student) {
      res.status(404).json({ error: 'Student profile not found' });
      return;
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id, status: 'approved' },
      include: { section: { include: { subject: true } } },
    });

    const allGrades = [];
    for (const enrollment of enrollments) {
      const result = await getSectionGrades(enrollment.sectionId, student.id);
      if (result?.grades[0]) {
        allGrades.push({
          section: enrollment.section,
          grade: result.grades[0],
        });
      }
    }

    res.json({ grades: allGrades });
  } catch (err) {
    next(err);
  }
});

router.post('/sections/:sectionId/grades/notify', authenticate, authorize('faculty', 'admin'), async (req, res, next) => {
  try {
    const { studentId } = req.body;
    const result = await getSectionGrades(routeParam(req.params.sectionId), studentId);
    if (!result?.grades[0]) {
      res.status(404).json({ error: 'Grade not found' });
      return;
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });
    const section = await prisma.courseSection.findUnique({
      where: { id: routeParam(req.params.sectionId) },
      include: { subject: true },
    });

    if (student && section) {
      await sendGradePostedEmail(
        student.user.email,
        `${student.user.firstName} ${student.user.lastName}`,
        `${section.subject.code} - ${section.sectionCode}`,
        result.grades[0].finalScore,
        result.grades[0].letterGrade,
      );
    }

    res.json({ message: 'Notification sent' });
  } catch (err) {
    next(err);
  }
});

export default router;
