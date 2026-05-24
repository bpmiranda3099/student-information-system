import { Router, type Router as RouterType } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import {
  createSyllabusSchema,
  createLessonSchema,
  tailorLessonRequestSchema,
  identifyWeakTopics,
  type GradeComponentType,
} from '@sis/shared';
import { prisma } from '../lib/prisma.js';
import { routeParam } from '../lib/params.js';
import { uploadFile, downloadFile, STORAGE_BUCKET } from '../lib/storage.js';
import { generateTailoredLesson } from '../lib/gemini.js';
import { extractPdfText } from '../lib/pdf.js';
import { sendAiLessonReadyEmail } from '../lib/resend.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router: RouterType = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'AI rate limit exceeded' },
});

router.get('/sections/:sectionId/syllabus', authenticate, async (req, res, next) => {
  try {
    const syllabus = await prisma.syllabus.findUnique({
      where: { sectionId: routeParam(req.params.sectionId) },
      include: { lessons: { include: { files: true }, orderBy: { week: 'asc' } } },
    });
    if (!syllabus) {
      res.json({ syllabus: null });
      return;
    }
    res.json({
      syllabus: {
        id: syllabus.id,
        sectionId: syllabus.sectionId,
        title: syllabus.title,
        description: syllabus.description,
        filePath: syllabus.filePath,
        createdAt: syllabus.createdAt.toISOString(),
        lessons: syllabus.lessons.map((l) => ({
          id: l.id,
          syllabusId: l.syllabusId,
          title: l.title,
          week: l.week,
          topics: l.topics as string[],
          createdAt: l.createdAt.toISOString(),
          files: l.files.map((f) => ({
            id: f.id,
            lessonId: f.lessonId,
            fileName: f.fileName,
            filePath: f.filePath,
            mimeType: f.mimeType,
            fileSize: f.fileSize,
            createdAt: f.createdAt.toISOString(),
          })),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/sections/:sectionId/syllabus',
  authenticate,
  authorize('faculty', 'admin'),
  validateBody(createSyllabusSchema),
  async (req, res, next) => {
    try {
      const syllabus = await prisma.syllabus.upsert({
        where: { sectionId: routeParam(req.params.sectionId) },
        create: { sectionId: routeParam(req.params.sectionId), ...req.body },
        update: req.body,
      });
      res.json({
        syllabus: {
          id: syllabus.id,
          sectionId: syllabus.sectionId,
          title: syllabus.title,
          description: syllabus.description,
          filePath: syllabus.filePath,
          createdAt: syllabus.createdAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/sections/:sectionId/syllabus/upload',
  authenticate,
  authorize('faculty', 'admin'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'File required' });
        return;
      }

      const path = `syllabi/${routeParam(req.params.sectionId)}/${uuidv4()}-${req.file.originalname}`;
      await uploadFile(STORAGE_BUCKET, path, req.file.buffer, req.file.mimetype);

      const syllabus = await prisma.syllabus.upsert({
        where: { sectionId: routeParam(req.params.sectionId) },
        create: {
          sectionId: routeParam(req.params.sectionId),
          title: 'Course Syllabus',
          filePath: path,
        },
        update: { filePath: path },
      });

      res.json({ syllabus: { id: syllabus.id, filePath: path } });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/syllabus/:syllabusId/lessons',
  authenticate,
  authorize('faculty', 'admin'),
  validateBody(createLessonSchema),
  async (req, res, next) => {
    try {
      const lesson = await prisma.lesson.create({
        data: {
          syllabusId: routeParam(req.params.syllabusId),
          title: req.body.title,
          week: req.body.week,
          topics: req.body.topics ?? [],
        },
      });
      res.status(201).json({
        lesson: {
          id: lesson.id,
          syllabusId: lesson.syllabusId,
          title: lesson.title,
          week: lesson.week,
          topics: lesson.topics as string[],
          createdAt: lesson.createdAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/lessons/:lessonId/upload',
  authenticate,
  authorize('faculty', 'admin'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'File required' });
        return;
      }

      const path = `lessons/${routeParam(req.params.lessonId)}/${uuidv4()}-${req.file.originalname}`;
      await uploadFile(STORAGE_BUCKET, path, req.file.buffer, req.file.mimetype);

      const file = await prisma.lessonFile.create({
        data: {
          lessonId: routeParam(req.params.lessonId),
          fileName: req.file.originalname,
          filePath: path,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
        },
      });

      res.status(201).json({
        file: {
          id: file.id,
          lessonId: file.lessonId,
          fileName: file.fileName,
          filePath: file.filePath,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          createdAt: file.createdAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/ai/tailor-lesson',
  authenticate,
  authorize('faculty', 'admin'),
  aiLimiter,
  validateBody(tailorLessonRequestSchema),
  async (req, res, next) => {
    try {
      const { lessonId, studentId, notifyStudent } = req.body;

      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          files: true,
          syllabus: { include: { section: { include: { gradeScheme: { include: { components: true } } } } } },
        },
      });
      if (!lesson) {
        res.status(404).json({ error: 'Lesson not found' });
        return;
      }

      const scheme = lesson.syllabus.section.gradeScheme;
      let weakTopics: string[] = [];

      if (scheme) {
        const entries = await prisma.gradeEntry.findMany({
          where: { studentId, component: { schemeId: scheme.id } },
        });
        const components = scheme.components.map((c) => ({
          id: c.id,
          type: c.type as GradeComponentType,
          maxScore: c.maxScore,
          topicTags: c.topicTags as string[],
        }));
        weakTopics = identifyWeakTopics(
          components,
          entries.map((e) => ({ componentId: e.componentId, score: e.score })),
        );
      }

      let pdfText = '';
      const pdfFile = lesson.files.find((f) => f.mimeType === 'application/pdf');
      if (pdfFile) {
        try {
          const buffer = await downloadFile(STORAGE_BUCKET, pdfFile.filePath);
          pdfText = await extractPdfText(buffer);
        } catch {
          // continue without PDF text
        }
      }

      const aiRequest = await prisma.aiLessonRequest.create({
        data: {
          studentId,
          lessonId,
          weakTopics,
          prompt: `Tailor lesson for weak topics: ${weakTopics.join(', ')}`,
          status: 'pending',
        },
      });

      try {
        const response = await generateTailoredLesson({
          lessonTitle: lesson.title,
          lessonTopics: lesson.topics as string[],
          weakTopics,
          pdfText,
        });

        const updated = await prisma.aiLessonRequest.update({
          where: { id: aiRequest.id },
          data: { response, status: 'completed' },
        });

        if (notifyStudent) {
          const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: { user: true },
          });
          if (student) {
            await sendAiLessonReadyEmail(
              student.user.email,
              `${student.user.firstName} ${student.user.lastName}`,
              lesson.title,
            );
          }
        }

        res.json({
          request: {
            id: updated.id,
            studentId: updated.studentId,
            lessonId: updated.lessonId,
            weakTopics: updated.weakTopics as string[],
            prompt: updated.prompt,
            response: updated.response,
            status: updated.status,
            createdAt: updated.createdAt.toISOString(),
          },
        });
      } catch (err) {
        await prisma.aiLessonRequest.update({
          where: { id: aiRequest.id },
          data: { status: 'failed' },
        });
        throw err;
      }
    } catch (err) {
      next(err);
    }
  },
);

router.get('/ai/requests', authenticate, async (req, res, next) => {
  try {
    const where =
      req.user!.role === 'student'
        ? { student: { userId: req.user!.userId } }
        : req.user!.role === 'faculty'
          ? { lesson: { syllabus: { section: { faculty: { userId: req.user!.userId } } } } }
          : {};

    const requests = await prisma.aiLessonRequest.findMany({
      where,
      include: { lesson: true, student: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      requests: requests.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        lessonId: r.lessonId,
        weakTopics: r.weakTopics as string[],
        prompt: r.prompt,
        response: r.response,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        lessonTitle: r.lesson.title,
        studentName: `${r.student.user.firstName} ${r.student.user.lastName}`,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/ai/requests/:id', authenticate, async (req, res, next) => {
  try {
    const request = await prisma.aiLessonRequest.findUnique({
      where: { id: routeParam(req.params.id) },
      include: { lesson: true },
    });
    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    res.json({
      request: {
        id: request.id,
        studentId: request.studentId,
        lessonId: request.lessonId,
        weakTopics: request.weakTopics as string[],
        prompt: request.prompt,
        response: request.response,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
        lessonTitle: request.lesson.title,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
