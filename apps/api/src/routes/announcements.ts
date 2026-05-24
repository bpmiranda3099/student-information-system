import { Router, type Router as RouterType } from 'express';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from '@sis/shared';
import { prisma } from '../lib/prisma.js';
import { routeParam } from '../lib/params.js';
import {
  serializeAnnouncement,
  serializeExternalAlert,
} from '../lib/extended-serializers.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { syncAllExternalAlerts } from '../services/alerts/index.js';

const router: RouterType = Router();

function activeAnnouncementFilter() {
  const now = new Date();
  return {
    publishedAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

async function getUserSectionIds(userId: string, role: string): Promise<string[]> {
  if (role === 'faculty') {
    const faculty = await prisma.faculty.findUnique({ where: { userId } });
    if (!faculty) return [];
    const sections = await prisma.courseSection.findMany({
      where: { facultyId: faculty.id },
      select: { id: true },
    });
    return sections.map((s) => s.id);
  }
  if (role === 'student') {
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) return [];
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id, status: 'approved' },
      select: { sectionId: true },
    });
    return enrollments.map((e) => e.sectionId);
  }
  return [];
}

router.get('/announcements', authenticate, async (req, res, next) => {
  try {
    const category = req.query.category ? String(req.query.category) : undefined;
    const sectionIds = await getUserSectionIds(req.user!.userId, req.user!.role);

    const announcements = await prisma.announcement.findMany({
      where: {
        ...activeAnnouncementFilter(),
        ...(category ? { category: category as never } : {}),
        OR: [{ sectionId: null }, ...(sectionIds.length ? [{ sectionId: { in: sectionIds } }] : [])],
      },
      include: { section: true },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });
    res.json({ announcements: announcements.map(serializeAnnouncement) });
  } catch (err) {
    next(err);
  }
});

router.get('/announcements/feed', authenticate, async (req, res, next) => {
  try {
    const sectionIds = await getUserSectionIds(req.user!.userId, req.user!.role);
    const announcements = await prisma.announcement.findMany({
      where: {
        ...activeAnnouncementFilter(),
        OR: [{ sectionId: null }, ...(sectionIds.length ? [{ sectionId: { in: sectionIds } }] : [])],
      },
      include: { section: true },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    });
    const banner = announcements.find((a) =>
      ['critical', 'high'].includes(a.severity) &&
      ['disaster', 'no_classes'].includes(a.category),
    );
    res.json({
      announcements: announcements.map(serializeAnnouncement),
      banner: banner ? serializeAnnouncement(banner) : null,
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/announcements',
  authenticate,
  validateBody(createAnnouncementSchema),
  async (req, res, next) => {
    try {
      const { title, body, category, severity, publishedAt, expiresAt, sectionId } = req.body;
      const role = req.user!.role;

      if (role === 'admin') {
        // global or section-scoped
      } else if (role === 'faculty') {
        if (!sectionId) {
          res.status(403).json({ error: 'Faculty announcements must target a section' });
          return;
        }
        const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.userId } });
        const section = await prisma.courseSection.findFirst({
          where: { id: sectionId, facultyId: faculty?.id },
        });
        if (!section) {
          res.status(403).json({ error: 'You can only announce for your own sections' });
          return;
        }
      } else {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const announcement = await prisma.announcement.create({
        data: {
          title,
          body,
          category,
          severity: severity ?? 'medium',
          publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          source: 'manual',
          sectionId: sectionId ?? null,
          createdById: req.user!.userId,
        },
        include: { section: true },
      });
      res.status(201).json({ announcement: serializeAnnouncement(announcement) });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/announcements/:id',
  authenticate,
  authorize('admin'),
  validateBody(updateAnnouncementSchema),
  async (req, res, next) => {
    try {
      const { publishedAt, expiresAt, ...rest } = req.body;
      const announcement = await prisma.announcement.update({
        where: { id: routeParam(req.params.id) },
        data: {
          ...rest,
          ...(publishedAt ? { publishedAt: new Date(publishedAt) } : {}),
          ...(expiresAt !== undefined
            ? { expiresAt: expiresAt ? new Date(expiresAt) : null }
            : {}),
        },
        include: { section: true },
      });
      res.json({ announcement: serializeAnnouncement(announcement) });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/announcements/:id',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      await prisma.announcement.delete({ where: { id: routeParam(req.params.id) } });
      res.json({ message: 'Deleted' });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/admin/alerts/inbox', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    const alerts = await prisma.externalAlert.findMany({
      where: { dismissed: false },
      orderBy: { issuedAt: 'desc' },
      take: 50,
    });
    res.json({ alerts: alerts.map(serializeExternalAlert) });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/admin/alerts/:id/dismiss',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const alert = await prisma.externalAlert.update({
        where: { id: routeParam(req.params.id) },
        data: { dismissed: true },
      });
      res.json({ alert: serializeExternalAlert(alert) });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/admin/announcements/promote/:externalAlertId',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const alertId = routeParam(req.params.externalAlertId);
      const alert = await prisma.externalAlert.findUnique({ where: { id: alertId } });
      if (!alert) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      const existing = await prisma.announcement.findUnique({
        where: { externalAlertId: alertId },
      });
      if (existing) {
        res.json({ announcement: serializeAnnouncement(existing) });
        return;
      }

      const announcement = await prisma.announcement.create({
        data: {
          title: alert.title,
          body: alert.summary,
          category: alert.category,
          severity: alert.severity,
          publishedAt: alert.issuedAt,
          source: 'external',
          externalAlertId: alert.id,
          createdById: req.user!.userId,
        },
        include: { section: true },
      });
      res.status(201).json({ announcement: serializeAnnouncement(announcement) });
    } catch (err) {
      next(err);
    }
  },
);

router.post('/admin/alerts/sync', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    const results = await syncAllExternalAlerts();
    res.json({ results });
  } catch (err) {
    next(err);
  }
});

export default router;
