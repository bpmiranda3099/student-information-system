import { Router, type Router as RouterType } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { updateProfileSchema } from '@sis/shared';
import { AVATARS_BUCKET } from '@sis/shared';
import { prisma } from '../lib/prisma.js';
import { routeParam } from '../lib/params.js';
import { buildProfile, canViewProfile, loadProfileUser } from '../lib/profile.js';
import { uploadFile } from '../lib/storage.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router: RouterType = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

router.get('/profiles/me', authenticate, async (req, res, next) => {
  try {
    const user = await loadProfileUser(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json({ profile: await buildProfile(user) });
  } catch (err) {
    next(err);
  }
});

router.patch('/profiles/me', authenticate, validateBody(updateProfileSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: req.body,
      include: { student: { include: { program: true } }, faculty: true },
    });
    res.json({ profile: await buildProfile(user) });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/profiles/me/photo',
  authenticate,
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Photo file required' });
        return;
      }
      if (!req.file.mimetype.startsWith('image/')) {
        res.status(400).json({ error: 'Image file required' });
        return;
      }
      const path = `users/${req.user!.userId}/${uuidv4()}-${req.file.originalname}`;
      await uploadFile(AVATARS_BUCKET, path, req.file.buffer, req.file.mimetype);
      const user = await prisma.user.update({
        where: { id: req.user!.userId },
        data: { photoPath: path },
        include: { student: { include: { program: true } }, faculty: true },
      });
      res.json({ profile: await buildProfile(user) });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/profiles/:userId', authenticate, async (req, res, next) => {
  try {
    const targetUserId = routeParam(req.params.userId);
    const allowed = await canViewProfile(req.user!.userId, req.user!.role, targetUserId);
    if (!allowed) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const user = await loadProfileUser(targetUserId);
    if (!user) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json({ profile: await buildProfile(user) });
  } catch (err) {
    next(err);
  }
});

export default router;
