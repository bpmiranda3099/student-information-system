import { Router, type Router as RouterType } from 'express';
import {
  createConductReportSchema,
  updateConductReportSchema,
} from '@sis/shared';
import { prisma } from '../lib/prisma.js';
import { routeParam } from '../lib/params.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router: RouterType = Router();

function serializeReport(r: {
  id: string;
  studentId: string;
  reporterId: string;
  violationType: string;
  description: string;
  status: string;
  resolutionNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  student?: { user: { firstName: string; lastName: string } };
  reporter?: { firstName: string; lastName: string };
}) {
  return {
    id: r.id,
    studentId: r.studentId,
    studentName: r.student
      ? `${r.student.user.firstName} ${r.student.user.lastName}`
      : undefined,
    reporterId: r.reporterId,
    reporterName: r.reporter
      ? `${r.reporter.firstName} ${r.reporter.lastName}`
      : undefined,
    violationType: r.violationType,
    description: r.description,
    status: r.status,
    resolutionNotes: r.resolutionNotes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

router.get('/students', authenticate, authorize('faculty', 'admin'), async (req, res, next) => {
  try {
    let students;
    if (req.user!.role === 'admin') {
      students = await prisma.student.findMany({
        include: { user: true },
        orderBy: { user: { lastName: 'asc' } },
        take: 200,
      });
    } else {
      const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.userId } });
      if (!faculty) {
        res.json({ students: [] });
        return;
      }
      const enrollments = await prisma.enrollment.findMany({
        where: { section: { facultyId: faculty.id }, status: 'approved' },
        include: { student: { include: { user: true } } },
      });
      const unique = new Map(enrollments.map((e) => [e.studentId, e.student]));
      students = [...unique.values()];
    }
    res.json({
      students: students.map((s) => ({
        id: s.id,
        name: `${s.user.firstName} ${s.user.lastName}`,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/reports', authenticate, async (req, res, next) => {
  try {
    const role = req.user!.role;
    let where = {};

    if (role === 'admin') {
      where = {};
    } else if (role === 'faculty') {
      where = { reporterId: req.user!.userId };
    } else if (role === 'student') {
      const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
      if (!student) {
        res.json({ reports: [], summary: { openCount: 0 } });
        return;
      }
      where = { studentId: student.id };
    } else {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const reports = await prisma.conductReport.findMany({
      where,
      include: {
        student: { include: { user: true } },
        reporter: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const openCount =
      role === 'student'
        ? reports.filter((r) => ['open', 'under_review'].includes(r.status)).length
        : undefined;

    res.json({
      reports: reports.map(serializeReport),
      ...(openCount !== undefined ? { summary: { openCount } } : {}),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/reports',
  authenticate,
  authorize('faculty', 'admin'),
  validateBody(createConductReportSchema),
  async (req, res, next) => {
    try {
      const report = await prisma.conductReport.create({
        data: {
          studentId: req.body.studentId,
          reporterId: req.user!.userId,
          violationType: req.body.violationType,
          description: req.body.description,
        },
        include: {
          student: { include: { user: true } },
          reporter: true,
        },
      });
      res.status(201).json({ report: serializeReport(report) });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/reports/:id',
  authenticate,
  authorize('admin'),
  validateBody(updateConductReportSchema),
  async (req, res, next) => {
    try {
      const report = await prisma.conductReport.update({
        where: { id: routeParam(req.params.id) },
        data: req.body,
        include: {
          student: { include: { user: true } },
          reporter: true,
        },
      });
      res.json({ report: serializeReport(report) });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
