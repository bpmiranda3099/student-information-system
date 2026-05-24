import { Router, type Router as RouterType } from 'express';
import { createProgramSchema, createSubjectSchema, createTermSchema, createSectionSchema } from '@sis/shared';
import { prisma } from '../lib/prisma.js';
import { routeParam } from '../lib/params.js';
import {
  serializeProgram,
  serializeSubject,
  serializeTerm,
  serializeSection,
} from '../lib/serializers.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router: RouterType = Router();

// Programs
router.get('/programs', authenticate, async (_req, res, next) => {
  try {
    const programs = await prisma.program.findMany({ orderBy: { code: 'asc' } });
    res.json({ programs: programs.map(serializeProgram) });
  } catch (err) {
    next(err);
  }
});

router.post('/programs', authenticate, authorize('admin'), validateBody(createProgramSchema), async (req, res, next) => {
  try {
    const program = await prisma.program.create({ data: req.body });
    res.status(201).json({ program: serializeProgram(program) });
  } catch (err) {
    next(err);
  }
});

router.get('/faculty', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    const faculty = await prisma.faculty.findMany({
      include: { user: true },
      orderBy: { user: { lastName: 'asc' } },
    });
    res.json({
      faculty: faculty.map((f) => ({
        id: f.id,
        employeeId: f.employeeId,
        department: f.department,
        name: `${f.user.firstName} ${f.user.lastName}`,
        email: f.user.email,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Subjects
router.get('/subjects', authenticate, async (_req, res, next) => {
  try {
    const subjects = await prisma.subject.findMany({ orderBy: { code: 'asc' } });
    res.json({ subjects: subjects.map(serializeSubject) });
  } catch (err) {
    next(err);
  }
});

router.post('/subjects', authenticate, authorize('admin'), validateBody(createSubjectSchema), async (req, res, next) => {
  try {
    const subject = await prisma.subject.create({ data: req.body });
    res.status(201).json({ subject: serializeSubject(subject) });
  } catch (err) {
    next(err);
  }
});

// Terms
router.get('/terms', authenticate, async (_req, res, next) => {
  try {
    const terms = await prisma.academicTerm.findMany({ orderBy: [{ year: 'desc' }, { semester: 'desc' }] });
    res.json({ terms: terms.map(serializeTerm) });
  } catch (err) {
    next(err);
  }
});

router.post('/terms', authenticate, authorize('admin'), validateBody(createTermSchema), async (req, res, next) => {
  try {
    const { startDate, endDate, ...rest } = req.body;
    const term = await prisma.academicTerm.create({
      data: { ...rest, startDate: new Date(startDate), endDate: new Date(endDate) },
    });
    res.status(201).json({ term: serializeTerm(term) });
  } catch (err) {
    next(err);
  }
});

// Sections
router.get('/sections', authenticate, async (req, res, next) => {
  try {
    const { termId, facultyId } = req.query;
    const sections = await prisma.courseSection.findMany({
      where: {
        ...(termId ? { termId: String(termId) } : {}),
        ...(facultyId ? { facultyId: String(facultyId) } : {}),
      },
      include: {
        subject: true,
        term: true,
        _count: { select: { enrollments: { where: { status: 'approved' } } } },
      },
      orderBy: { sectionCode: 'asc' },
    });
    res.json({ sections: sections.map(serializeSection) });
  } catch (err) {
    next(err);
  }
});

router.get('/sections/:id', authenticate, async (req, res, next) => {
  try {
    const section = await prisma.courseSection.findUnique({
      where: { id: routeParam(req.params.id) },
      include: { subject: true, term: true, _count: { select: { enrollments: { where: { status: 'approved' } } } } },
    });
    if (!section) {
      res.status(404).json({ error: 'Section not found' });
      return;
    }
    res.json({ section: serializeSection(section) });
  } catch (err) {
    next(err);
  }
});

router.get('/sections/:sectionId/students', authenticate, authorize('faculty', 'admin'), async (req, res, next) => {
  try {
    const sectionId = routeParam(req.params.sectionId);
    const enrollments = await prisma.enrollment.findMany({
      where: { sectionId, status: 'approved' },
      include: {
        student: {
          include: { user: true },
        },
      },
      orderBy: { student: { user: { lastName: 'asc' } } },
    });

    res.json({
      students: enrollments.map((e) => ({
        studentId: e.studentId,
        studentNumber: e.student.studentNumber,
        firstName: e.student.user.firstName,
        lastName: e.student.user.lastName,
        email: e.student.user.email,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/sections', authenticate, authorize('admin'), validateBody(createSectionSchema), async (req, res, next) => {
  try {
    const section = await prisma.courseSection.create({
      data: req.body,
      include: { subject: true, term: true, _count: { select: { enrollments: true } } },
    });
    res.status(201).json({ section: serializeSection(section) });
  } catch (err) {
    next(err);
  }
});

export default router;
