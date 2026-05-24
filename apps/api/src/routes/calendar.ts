import { Router, type Router as RouterType } from 'express';
import { createCalendarEventSchema, updateCalendarEventSchema } from '@sis/shared';
import { prisma } from '../lib/prisma.js';
import { routeParam } from '../lib/params.js';
import { serializeCalendarEvent } from '../lib/extended-serializers.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { syncPhHolidaysToCalendar } from '../services/alerts/ph-holidays.js';

const router: RouterType = Router();

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

router.get('/calendar/events', authenticate, async (req, res, next) => {
  try {
    const { termId, from, to } = req.query;
    const events = await prisma.academicCalendarEvent.findMany({
      where: {
        ...(termId ? { termId: String(termId) } : {}),
        ...(from || to
          ? {
              startDate: {
                ...(to ? { lte: parseDate(String(to)) } : {}),
              },
              endDate: {
                ...(from ? { gte: parseDate(String(from)) } : {}),
              },
            }
          : {}),
      },
      orderBy: { startDate: 'asc' },
    });
    res.json({ events: events.map(serializeCalendarEvent) });
  } catch (err) {
    next(err);
  }
});

router.get('/calendar/upcoming', authenticate, async (_req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + 14);

    const events = await prisma.academicCalendarEvent.findMany({
      where: {
        endDate: { gte: today },
        startDate: { lte: end },
      },
      orderBy: { startDate: 'asc' },
      take: 10,
    });
    res.json({ events: events.map(serializeCalendarEvent) });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/calendar/events',
  authenticate,
  authorize('admin'),
  validateBody(createCalendarEventSchema),
  async (req, res, next) => {
    try {
      const { termId, title, description, startDate, endDate, type, allDay } = req.body;
      const event = await prisma.academicCalendarEvent.create({
        data: {
          termId,
          title,
          description,
          startDate: parseDate(startDate),
          endDate: parseDate(endDate),
          type,
          source: 'manual',
          allDay: allDay ?? true,
        },
      });
      res.status(201).json({ event: serializeCalendarEvent(event) });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/calendar/events/:id',
  authenticate,
  authorize('admin'),
  validateBody(updateCalendarEventSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.academicCalendarEvent.findUnique({
        where: { id: routeParam(req.params.id) },
      });
      if (!existing || existing.source !== 'manual') {
        res.status(400).json({ error: 'Only manual events can be edited' });
        return;
      }
      const { startDate, endDate, ...rest } = req.body;
      const event = await prisma.academicCalendarEvent.update({
        where: { id: existing.id },
        data: {
          ...rest,
          ...(startDate ? { startDate: parseDate(startDate) } : {}),
          ...(endDate ? { endDate: parseDate(endDate) } : {}),
        },
      });
      res.json({ event: serializeCalendarEvent(event) });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/calendar/events/:id',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const existing = await prisma.academicCalendarEvent.findUnique({
        where: { id: routeParam(req.params.id) },
      });
      if (!existing || existing.source !== 'manual') {
        res.status(400).json({ error: 'Only manual events can be deleted' });
        return;
      }
      await prisma.academicCalendarEvent.delete({ where: { id: existing.id } });
      res.json({ message: 'Deleted' });
    } catch (err) {
      next(err);
    }
  },
);

router.post('/admin/calendar/sync-holidays', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const year = Number(req.query.year ?? new Date().getFullYear());
    const count = await syncPhHolidaysToCalendar(year);
    res.json({ synced: count, year });
  } catch (err) {
    next(err);
  }
});

export default router;
