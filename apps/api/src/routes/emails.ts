import { Router, type Router as RouterType } from 'express';
import {
  sendEmailSchema,
  sendBatchEmailSchema,
  updateEmailSchema,
} from '@sis/shared';
import {
  sendEmailMessage,
  sendBatchEmailMessages,
  getEmailMessage,
  updateEmailMessage,
  cancelEmailMessage,
  listEmailMessages,
  listEmailAttachments,
  getEmailAttachment,
  ResendServiceError,
} from '../lib/resend.js';
import { routeParam } from '../lib/params.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router: RouterType = Router();

router.use(authenticate, authorize('admin'));

router.post('/send', validateBody(sendEmailSchema), async (req, res, next) => {
  try {
    const data = await sendEmailMessage(req.body);
    res.status(201).json({ email: data });
  } catch (err) {
    next(err instanceof ResendServiceError ? Object.assign(err, { status: err.status }) : err);
  }
});

router.post('/batch', validateBody(sendBatchEmailSchema), async (req, res, next) => {
  try {
    const data = await sendBatchEmailMessages(req.body.emails);
    res.status(201).json({ batch: data });
  } catch (err) {
    next(err instanceof ResendServiceError ? Object.assign(err, { status: err.status }) : err);
  }
});

router.get('/', async (_req, res, next) => {
  try {
    const data = await listEmailMessages();
    res.json({ emails: data });
  } catch (err) {
    next(err instanceof ResendServiceError ? Object.assign(err, { status: err.status }) : err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const data = await getEmailMessage(routeParam(req.params.id));
    res.json({ email: data });
  } catch (err) {
    next(err instanceof ResendServiceError ? Object.assign(err, { status: err.status }) : err);
  }
});

router.patch('/:id', validateBody(updateEmailSchema), async (req, res, next) => {
  try {
    const data = await updateEmailMessage(routeParam(req.params.id), req.body.scheduledAt);
    res.json({ email: data });
  } catch (err) {
    next(err instanceof ResendServiceError ? Object.assign(err, { status: err.status }) : err);
  }
});

router.post('/:id/cancel', async (req, res, next) => {
  try {
    const data = await cancelEmailMessage(routeParam(req.params.id));
    res.json({ email: data });
  } catch (err) {
    next(err instanceof ResendServiceError ? Object.assign(err, { status: err.status }) : err);
  }
});

router.get('/:id/attachments', async (req, res, next) => {
  try {
    const data = await listEmailAttachments(routeParam(req.params.id));
    res.json({ attachments: data });
  } catch (err) {
    next(err instanceof ResendServiceError ? Object.assign(err, { status: err.status }) : err);
  }
});

router.get('/:id/attachments/:attachmentId', async (req, res, next) => {
  try {
    const data = await getEmailAttachment(
      routeParam(req.params.id),
      routeParam(req.params.attachmentId),
    );
    res.json({ attachment: data });
  } catch (err) {
    next(err instanceof ResendServiceError ? Object.assign(err, { status: err.status }) : err);
  }
});

export default router;
