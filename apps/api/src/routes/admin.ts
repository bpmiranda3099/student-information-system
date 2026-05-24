import { Router, type Router as RouterType } from 'express';
import { prisma } from '../lib/prisma.js';
import { routeParam } from '../lib/params.js';
import { computeGrade, type GradeComponentType } from '@sis/shared';
import { authenticate, authorize } from '../middleware/auth.js';

const router: RouterType = Router();

router.get('/reports/enrollment', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const termId = String(req.query.termId ?? '');
    const enrollments = await prisma.enrollment.findMany({
      where: termId ? { section: { termId } } : {},
      include: { student: { include: { program: true } } },
    });

    const byStatus: Record<string, number> = {};
    const programCounts: Record<string, number> = {};

    for (const e of enrollments) {
      byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
      const code = e.student.program.code;
      programCounts[code] = (programCounts[code] ?? 0) + 1;
    }

    res.json({
      report: {
        termId: termId || 'all',
        totalEnrollments: enrollments.length,
        byStatus,
        byProgram: Object.entries(programCounts).map(([programCode, count]) => ({
          programCode,
          count,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/reports/grades/:sectionId', authenticate, authorize('admin', 'faculty'), async (req, res, next) => {
  try {
    const scheme = await prisma.gradeScheme.findUnique({
      where: { sectionId: routeParam(req.params.sectionId) },
      include: { components: true },
    });
    if (!scheme) {
      res.status(404).json({ error: 'Grade scheme not found' });
      return;
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { sectionId: routeParam(req.params.sectionId), status: 'approved' },
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

    const studentGrades = enrollments.map((e) =>
      computeGrade({
        studentId: e.studentId,
        sectionId: routeParam(req.params.sectionId),
        components,
        entries: entries
          .filter((en) => en.studentId === e.studentId)
          .map((en) => ({ componentId: en.componentId, score: en.score })),
        categoryWeights,
        extracurricularMax: scheme.extracurricularMax,
      }),
    );

    const distribution: Record<string, number> = {};
    let totalScore = 0;
    for (const g of studentGrades) {
      distribution[g.letterGrade] = (distribution[g.letterGrade] ?? 0) + 1;
      totalScore += g.finalScore;
    }

    res.json({
      report: {
        sectionId: routeParam(req.params.sectionId),
        averageScore: studentGrades.length ? totalScore / studentGrades.length : 0,
        distribution: Object.entries(distribution).map(([letter, count]) => ({ letter, count })),
        studentGrades,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/reports/attendance/:sectionId', authenticate, authorize('admin', 'faculty'), async (req, res, next) => {
  try {
    const sessions = await prisma.attendanceSession.findMany({
      where: { sectionId: routeParam(req.params.sectionId) },
      include: { records: { include: { student: { include: { user: true } } } } },
    });

    const enrollments = await prisma.enrollment.findMany({
      where: { sectionId: routeParam(req.params.sectionId), status: 'approved' },
      include: { student: { include: { user: true } } },
    });

    const totalSessions = sessions.length;
    let totalRate = 0;
    const chronicAbsentees = [];

    for (const enrollment of enrollments) {
      const studentRecords = sessions.flatMap((s) =>
        s.records.filter((r) => r.studentId === enrollment.studentId),
      );
      const present = studentRecords.filter(
        (r) => r.status === 'present' || r.status === 'late',
      ).length;
      const absent = studentRecords.filter((r) => r.status === 'absent').length;
      const rate = totalSessions > 0 ? (present / totalSessions) * 100 : 100;
      totalRate += rate;

      if (absent >= 3) {
        chronicAbsentees.push({
          studentId: enrollment.studentId,
          studentName: `${enrollment.student.user.firstName} ${enrollment.student.user.lastName}`,
          absentCount: absent,
          attendanceRate: Math.round(rate),
        });
      }
    }

    res.json({
      report: {
        sectionId: routeParam(req.params.sectionId),
        averageAttendanceRate: enrollments.length ? totalRate / enrollments.length : 0,
        chronicAbsentees,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/analytics/overview', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    const [students, faculty, sections, enrollments, activeTerm] = await Promise.all([
      prisma.student.count(),
      prisma.faculty.count(),
      prisma.courseSection.count(),
      prisma.enrollment.count({ where: { status: 'approved' } }),
      prisma.academicTerm.findFirst({ where: { status: 'active' } }),
    ]);

    res.json({
      overview: {
        totalStudents: students,
        totalFaculty: faculty,
        totalSections: sections,
        activeEnrollments: enrollments,
        activeTerm: activeTerm?.name ?? 'None',
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/maintenance/archive-term/:termId', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const term = await prisma.academicTerm.update({
      where: { id: routeParam(req.params.termId) },
      data: { status: 'archived' },
    });

    await prisma.maintenanceJob.create({
      data: {
        type: 'archive_term',
        status: 'completed',
        payload: { termId: term.id },
        result: { archived: true },
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    res.json({ term: { id: term.id, status: term.status } });
  } catch (err) {
    next(err);
  }
});

router.get('/maintenance/jobs', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    const jobs = await prisma.maintenanceJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
});

export default router;
