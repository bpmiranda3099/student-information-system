import { Router, type Router as RouterType } from 'express';
import bcrypt from 'bcryptjs';
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
  adminResetPasswordSchema,
  computeGrade,
  type GradeComponentType,
} from '@sis/shared';
import { prisma } from '../lib/prisma.js';
import { routeParam } from '../lib/params.js';
import { serializeUser } from '../lib/serializers.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

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
    const [jobs, alertLogs] = await Promise.all([
      prisma.maintenanceJob.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.alertFetchLog.findMany({ orderBy: { ranAt: 'desc' }, take: 20 }),
    ]);
    res.json({ jobs, alertLogs });
  } catch (err) {
    next(err);
  }
});

router.get('/maintenance/orphans', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    const [sectionsMissingFaculty, enrollmentsOnArchivedTerms] = await Promise.all([
      prisma.courseSection.findMany({
        where: { faculty: { user: { isActive: false } } },
        include: { subject: true, term: true },
        take: 50,
      }),
      prisma.enrollment.findMany({
        where: { section: { term: { status: 'archived' } }, status: 'approved' },
        include: { student: { include: { user: true } }, section: { include: { subject: true, term: true } } },
        take: 50,
      }),
    ]);
    res.json({
      orphans: {
        sectionsMissingFaculty: sectionsMissingFaculty.length,
        enrollmentsOnArchivedTerms: enrollmentsOnArchivedTerms.length,
        sections: sectionsMissingFaculty.map((s) => ({
          id: s.id,
          label: `${s.subject.code} — ${s.sectionCode}`,
          term: s.term.name,
        })),
        enrollments: enrollmentsOnArchivedTerms.map((e) => ({
          id: e.id,
          student: `${e.student.user.lastName}, ${e.student.user.firstName}`,
          section: `${e.section.subject.code} — ${e.section.sectionCode}`,
          term: e.section.term.name,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/maintenance/export/enrollments', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      include: {
        student: { include: { user: true, program: true } },
        section: { include: { subject: true, term: true } },
      },
    });
    const header = 'student_name,student_number,program,subject,section,term,status,enrolled_at';
    const rows = enrollments.map((e) =>
      [
        `"${e.student.user.lastName}, ${e.student.user.firstName}"`,
        e.student.studentNumber,
        e.student.program.code,
        e.section.subject.code,
        e.section.sectionCode,
        e.section.term.name,
        e.status,
        e.enrolledAt.toISOString(),
      ].join(','),
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=enrollments.csv');
    res.send([header, ...rows].join('\n'));
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/maintenance/users/:id',
  authenticate,
  authorize('admin'),
  validateBody(adminUpdateUserSchema),
  async (req, res, next) => {
    try {
      const user = await prisma.user.update({
        where: { id: routeParam(req.params.id) },
        data: req.body,
      });
      res.json({ user: serializeUser(user) });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/maintenance/users/:id/reset-password',
  authenticate,
  authorize('admin'),
  validateBody(adminResetPasswordSchema),
  async (req, res, next) => {
    try {
      const passwordHash = await bcrypt.hash(req.body.password, 12);
      await prisma.user.update({
        where: { id: routeParam(req.params.id) },
        data: { passwordHash },
      });
      res.json({ message: 'Password reset' });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/maintenance/users',
  authenticate,
  authorize('admin'),
  validateBody(adminCreateUserSchema),
  async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, role, studentNumber, employeeId, programId } =
        req.body;
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: { email, passwordHash, firstName, lastName, role },
        });
        if (role === 'student') {
          if (!studentNumber || !programId) throw new Error('Student number and program required');
          await tx.student.create({ data: { userId: newUser.id, studentNumber, programId } });
        } else if (role === 'faculty') {
          if (!employeeId) throw new Error('Employee ID required');
          await tx.faculty.create({ data: { userId: newUser.id, employeeId } });
        } else {
          await tx.admin.create({ data: { userId: newUser.id } });
        }
        return newUser;
      });
      res.status(201).json({ user: serializeUser(user) });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
