import { Router, type Router as RouterType } from 'express';
import {
  createSupportTicketSchema,
  updateSupportTicketSchema,
} from '@sis/shared';
import { prisma } from '../lib/prisma.js';
import { routeParam } from '../lib/params.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router: RouterType = Router();

function serializeTicket(t: {
  id: string;
  subject: string;
  body: string;
  category: string;
  status: string;
  resolution: string | null;
  reopenedOnce: boolean;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { firstName: string; lastName: string };
  assignedTo?: { firstName: string; lastName: string } | null;
}) {
  return {
    id: t.id,
    subject: t.subject,
    body: t.body,
    category: t.category,
    status: t.status,
    resolution: t.resolution,
    reopenedOnce: t.reopenedOnce,
    resolvedAt: t.resolvedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    createdByName: t.createdBy
      ? `${t.createdBy.firstName} ${t.createdBy.lastName}`
      : undefined,
    assignedToName: t.assignedTo
      ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}`
      : null,
  };
}

router.get('/tickets', authenticate, async (req, res, next) => {
  try {
    const isAdmin = req.user!.role === 'admin';
    const tickets = await prisma.supportTicket.findMany({
      where: isAdmin ? {} : { createdById: req.user!.userId },
      include: {
        createdBy: true,
        assignedTo: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ tickets: tickets.map(serializeTicket) });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/tickets',
  authenticate,
  validateBody(createSupportTicketSchema),
  async (req, res, next) => {
    try {
      const ticket = await prisma.supportTicket.create({
        data: {
          createdById: req.user!.userId,
          subject: req.body.subject,
          body: req.body.body,
          category: req.body.category,
        },
        include: { createdBy: true, assignedTo: true },
      });
      res.status(201).json({ ticket: serializeTicket(ticket) });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/tickets/:id',
  authenticate,
  validateBody(updateSupportTicketSchema),
  async (req, res, next) => {
    try {
      const id = routeParam(req.params.id);
      const existing = await prisma.supportTicket.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }

      const isAdmin = req.user!.role === 'admin';
      const isOwner = existing.createdById === req.user!.userId;

      if (!isAdmin && !isOwner) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const { status, assignedToId, resolution } = req.body;

      if (!isAdmin && (assignedToId !== undefined || status === 'in_progress')) {
        res.status(403).json({ error: 'Only admins can assign or set in progress' });
        return;
      }

      if (!isAdmin && status === 'open' && existing.status === 'closed' && existing.reopenedOnce) {
        res.status(403).json({ error: 'Ticket can only be reopened once' });
        return;
      }

      const data: Record<string, unknown> = {};
      if (status) {
        data.status = status;
        if (status === 'resolved' || status === 'closed') {
          data.resolvedAt = new Date();
        }
        if (status === 'open' && existing.status === 'closed') {
          data.reopenedOnce = true;
          data.resolvedAt = null;
        }
      }
      if (isAdmin && assignedToId !== undefined) data.assignedToId = assignedToId;
      if (resolution !== undefined) data.resolution = resolution;

      const ticket = await prisma.supportTicket.update({
        where: { id },
        data,
        include: { createdBy: true, assignedTo: true },
      });
      res.json({ ticket: serializeTicket(ticket) });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/admin/tickets', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      include: { createdBy: true, assignedTo: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ tickets: tickets.map(serializeTicket) });
  } catch (err) {
    next(err);
  }
});

export default router;
