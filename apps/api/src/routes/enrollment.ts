import { Router, type Router as RouterType } from 'express';
import { createEnrollmentSchema, updateEnrollmentSchema } from '@sis/shared';
import { prisma } from '../lib/prisma.js';
import { routeParam } from '../lib/params.js';
import { serializeSection } from '../lib/serializers.js';
import { sendEnrollmentStatusEmail } from '../lib/resend.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router: RouterType = Router();

router.get('/enrollments', authenticate, async (req, res, next) => {
  try {
    const where =
      req.user!.role === 'student'
        ? { student: { userId: req.user!.userId } }
        : req.user!.role === 'admin'
          ? {}
          : { section: { faculty: { userId: req.user!.userId } } };

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        section: {
          include: {
            subject: true,
            term: true,
            _count: { select: { enrollments: { where: { status: 'approved' } } } },
          },
        },
        student: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      enrollments: enrollments.map((e) => ({
        id: e.id,
        studentId: e.studentId,
        sectionId: e.sectionId,
        status: e.status,
        enrolledAt: e.enrolledAt.toISOString(),
        createdAt: e.createdAt.toISOString(),
        section: serializeSection(e.section),
        studentName: e.student ? `${e.student.user.firstName} ${e.student.user.lastName}` : undefined,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/enrollments', authenticate, authorize('student'), validateBody(createEnrollmentSchema), async (req, res, next) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
    if (!student) {
      res.status(404).json({ error: 'Student profile not found' });
      return;
    }

    const section = await prisma.courseSection.findUnique({
      where: { id: req.body.sectionId },
      include: { subject: true, _count: { select: { enrollments: { where: { status: 'approved' } } } } },
    });
    if (!section) {
      res.status(404).json({ error: 'Section not found' });
      return;
    }
    if (section._count.enrollments >= section.capacity) {
      res.status(400).json({ error: 'Section is full' });
      return;
    }

    const enrollment = await prisma.enrollment.create({
      data: { studentId: student.id, sectionId: section.id },
      include: { section: { include: { subject: true, term: true, _count: { select: { enrollments: true } } } } },
    });

    res.status(201).json({
      enrollment: {
        id: enrollment.id,
        studentId: enrollment.studentId,
        sectionId: enrollment.sectionId,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt.toISOString(),
        createdAt: enrollment.createdAt.toISOString(),
        section: serializeSection(enrollment.section),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/enrollments/:id', authenticate, authorize('admin'), validateBody(updateEnrollmentSchema), async (req, res, next) => {
  try {
    const enrollment = await prisma.enrollment.update({
      where: { id: routeParam(req.params.id) },
      data: { status: req.body.status },
      include: {
        section: { include: { subject: true } },
        student: { include: { user: true } },
      },
    });

    if (req.body.status === 'approved' || req.body.status === 'dropped') {
      await sendEnrollmentStatusEmail(
        enrollment.student.user.email,
        `${enrollment.student.user.firstName} ${enrollment.student.user.lastName}`,
        `${enrollment.section.subject.code} - ${enrollment.section.sectionCode}`,
        req.body.status === 'approved',
      );
    }

    res.json({
      enrollment: {
        id: enrollment.id,
        studentId: enrollment.studentId,
        sectionId: enrollment.sectionId,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt.toISOString(),
        createdAt: enrollment.createdAt.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
