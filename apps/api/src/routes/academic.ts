import { Router, type Router as RouterType } from 'express';
import { createProgramSchema, createSubjectSchema, createTermSchema, createSectionSchema, upsertSectionMeetingsSchema, upsertProgramCurriculumSchema } from '@sis/shared';
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
import { serializeSectionMeeting } from '../lib/extended-serializers.js';
import { formatScheduleSummary, parseScheduleText } from '../lib/schedule-utils.js';

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

    const parsed = parseScheduleText(section.schedule);
    if (parsed.length) {
      await prisma.sectionMeeting.createMany({
        data: parsed.map((m) => ({
          sectionId: section.id,
          dayOfWeek: m.dayOfWeek,
          startTime: m.startTime,
          endTime: m.endTime,
          room: section.room,
        })),
      });
    }

    res.status(201).json({ section: serializeSection(section) });
  } catch (err) {
    next(err);
  }
});

router.get('/sections/:sectionId/meetings', authenticate, async (req, res, next) => {
  try {
    const meetings = await prisma.sectionMeeting.findMany({
      where: { sectionId: routeParam(req.params.sectionId) },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    res.json({ meetings: meetings.map(serializeSectionMeeting) });
  } catch (err) {
    next(err);
  }
});

router.put(
  '/sections/:sectionId/meetings',
  authenticate,
  authorize('admin'),
  validateBody(upsertSectionMeetingsSchema),
  async (req, res, next) => {
    try {
      const sectionId = routeParam(req.params.sectionId);
      const { meetings } = req.body;

      await prisma.$transaction(async (tx) => {
        await tx.sectionMeeting.deleteMany({ where: { sectionId } });
        if (meetings.length) {
          await tx.sectionMeeting.createMany({
            data: meetings.map((m: { dayOfWeek: number; startTime: string; endTime: string; room?: string }) => ({
              sectionId,
              dayOfWeek: m.dayOfWeek,
              startTime: m.startTime,
              endTime: m.endTime,
              room: m.room ?? null,
            })),
          });
        }
        const summary = formatScheduleSummary(meetings);
        const room = meetings.find((m: { room?: string }) => m.room)?.room ?? null;
        await tx.courseSection.update({
          where: { id: sectionId },
          data: { schedule: summary || null, room },
        });
      });

      const saved = await prisma.sectionMeeting.findMany({
        where: { sectionId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
      res.json({ meetings: saved.map(serializeSectionMeeting) });
    } catch (err) {
      next(err);
    }
  },
);

async function buildScheduleEntries(sectionFilter: object) {
  const sections = await prisma.courseSection.findMany({
    where: sectionFilter,
    include: {
      subject: true,
      meetings: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
    },
  });

  return sections.map((s) => ({
    sectionId: s.id,
    sectionCode: s.sectionCode,
    subjectCode: s.subject.code,
    subjectTitle: s.subject.title,
    room: s.room,
    meetings: s.meetings.map(serializeSectionMeeting),
  }));
}

router.get('/students/me/schedule', authenticate, authorize('student'), async (req, res, next) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
    if (!student) {
      res.status(404).json({ error: 'Student profile not found' });
      return;
    }
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id, status: 'approved' },
      select: { sectionId: true },
    });
    const sectionIds = enrollments.map((e) => e.sectionId);
    const schedule = await buildScheduleEntries({ id: { in: sectionIds } });
    res.json({ schedule });
  } catch (err) {
    next(err);
  }
});

router.get('/faculty/me/schedule', authenticate, authorize('faculty'), async (req, res, next) => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.userId } });
    if (!faculty) {
      res.status(404).json({ error: 'Faculty profile not found' });
      return;
    }
    const schedule = await buildScheduleEntries({ facultyId: faculty.id });
    res.json({ schedule });
  } catch (err) {
    next(err);
  }
});

router.get('/admin/curriculum', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const programId = req.query.programId ? String(req.query.programId) : undefined;
    const yearLevel = req.query.yearLevel ? Number(req.query.yearLevel) : undefined;
    const rows = await prisma.programCurriculum.findMany({
      where: {
        ...(programId ? { programId } : {}),
        ...(yearLevel ? { yearLevel } : {}),
      },
      include: { subject: true },
      orderBy: [{ yearLevel: 'asc' }, { subject: { code: 'asc' } }],
    });
    res.json({
      curriculum: rows.map((r) => ({
        id: r.id,
        programId: r.programId,
        subjectId: r.subjectId,
        yearLevel: r.yearLevel,
        requirementType: r.requirementType,
        subjectCode: r.subject.code,
        subjectTitle: r.subject.title,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/admin/curriculum',
  authenticate,
  authorize('admin'),
  validateBody(upsertProgramCurriculumSchema),
  async (req, res, next) => {
    try {
      const row = await prisma.programCurriculum.upsert({
        where: {
          programId_subjectId_yearLevel: {
            programId: req.body.programId,
            subjectId: req.body.subjectId,
            yearLevel: req.body.yearLevel,
          },
        },
        create: req.body,
        update: { requirementType: req.body.requirementType },
        include: { subject: true },
      });
      res.status(201).json({
        curriculum: {
          id: row.id,
          programId: row.programId,
          subjectId: row.subjectId,
          yearLevel: row.yearLevel,
          requirementType: row.requirementType,
          subjectCode: row.subject.code,
          subjectTitle: row.subject.title,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/admin/curriculum/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    await prisma.programCurriculum.delete({ where: { id: routeParam(req.params.id) } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
