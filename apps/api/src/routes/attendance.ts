import { Router, type Router as RouterType } from 'express';
import { createAttendanceSessionSchema, bulkAttendanceSchema } from '@sis/shared';
import type { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { routeParam } from '../lib/params.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router: RouterType = Router();

router.get('/sections/:sectionId/attendance/sessions', authenticate, async (req, res, next) => {
  try {
    const sessions = await prisma.attendanceSession.findMany({
      where: { sectionId: routeParam(req.params.sectionId) },
      include: { records: true },
      orderBy: { date: 'desc' },
    });

    res.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        sectionId: s.sectionId,
        date: s.date.toISOString().split('T')[0],
        topic: s.topic,
        createdAt: s.createdAt.toISOString(),
        recordCount: s.records.length,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/sections/:sectionId/attendance/sessions',
  authenticate,
  authorize('faculty', 'admin'),
  validateBody(createAttendanceSessionSchema),
  async (req, res, next) => {
    try {
      const session = await prisma.attendanceSession.create({
        data: {
          sectionId: routeParam(req.params.sectionId),
          date: new Date(req.body.date),
          topic: req.body.topic,
        },
      });

      res.status(201).json({
        session: {
          id: session.id,
          sectionId: session.sectionId,
          date: session.date.toISOString().split('T')[0],
          topic: session.topic,
          createdAt: session.createdAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/attendance/sessions/:sessionId/records', authenticate, async (req, res, next) => {
  try {
    const records = await prisma.attendanceRecord.findMany({
      where: { sessionId: routeParam(req.params.sessionId) },
      include: { student: { include: { user: true } } },
    });

    res.json({
      records: records.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        studentId: r.studentId,
        status: r.status,
        notes: r.notes,
        studentName: `${r.student.user.firstName} ${r.student.user.lastName}`,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/attendance/sessions/:sessionId/records',
  authenticate,
  authorize('faculty', 'admin'),
  validateBody(bulkAttendanceSchema),
  async (req, res, next) => {
    try {
      const results = await Promise.all(
        req.body.records.map((record: z.infer<typeof bulkAttendanceSchema>['records'][number]) =>
          prisma.attendanceRecord.upsert({
            where: {
              sessionId_studentId: {
                sessionId: routeParam(req.params.sessionId),
                studentId: record.studentId,
              },
            },
            create: {
              sessionId: routeParam(req.params.sessionId),
              studentId: record.studentId,
              status: record.status,
              notes: record.notes,
            },
            update: { status: record.status, notes: record.notes },
          }),
        ),
      );

      res.json({
        records: results.map((r) => ({
          id: r.id,
          sessionId: r.sessionId,
          studentId: r.studentId,
          status: r.status,
          notes: r.notes,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/students/me/attendance', authenticate, authorize('student'), async (req, res, next) => {
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

    const summary = [];
    for (const enrollment of enrollments) {
      const sessions = await prisma.attendanceSession.findMany({
        where: { sectionId: enrollment.sectionId },
        include: { records: { where: { studentId: student.id } } },
      });

      const total = sessions.length;
      const present = sessions.filter((s) =>
        s.records.some((r) => r.status === 'present' || r.status === 'late'),
      ).length;

      summary.push({
        sectionId: enrollment.sectionId,
        sectionName: `${enrollment.section.subject.code} - ${enrollment.section.sectionCode}`,
        totalSessions: total,
        presentCount: present,
        attendanceRate: total > 0 ? Math.round((present / total) * 100) : 100,
      });
    }

    res.json({ attendance: summary });
  } catch (err) {
    next(err);
  }
});

export default router;
