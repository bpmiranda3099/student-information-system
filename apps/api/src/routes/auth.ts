import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import {
  loginRequestSchema,
  registerRequestSchema,
  COOKIE_NAMES,
} from '@sis/shared';
import { prisma } from '../lib/prisma.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from '../lib/jwt.js';
import { serializeUser } from '../lib/serializers.js';
import { sendWelcomeEmail } from '../lib/resend.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router: Router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts' },
});

router.post('/login', authLimiter, validateBody(loginRequestSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    setAuthCookies(res, accessToken, refreshToken);

    res.json({ user: serializeUser(user), accessToken });
  } catch (err) {
    next(err);
  }
});

router.post('/register', authLimiter, validateBody(registerRequestSchema), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role, studentNumber, employeeId, programId } =
      req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { email, passwordHash, firstName, lastName, role },
      });

      if (role === 'student') {
        if (!studentNumber || !programId) {
          throw new Error('Student number and program required');
        }
        await tx.student.create({
          data: { userId: newUser.id, studentNumber, programId },
        });
      } else if (role === 'faculty') {
        if (!employeeId) throw new Error('Employee ID required');
        await tx.faculty.create({
          data: { userId: newUser.id, employeeId },
        });
      } else if (role === 'admin') {
        await tx.admin.create({ data: { userId: newUser.id } });
      }

      return newUser;
    });

    void sendWelcomeEmail(user.email, `${user.firstName} ${user.lastName}`).catch((err) => {
      console.error('Welcome email failed:', err);
    });

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({ user: serializeUser(user), accessToken });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', authLimiter, async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE_NAMES.refreshToken];
    if (!token) {
      res.status(401).json({ error: 'Refresh token required' });
      return;
    }

    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const newPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(newPayload);
    const refreshToken = signRefreshToken(newPayload);
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ user: serializeUser(user), accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', (_req, res) => {
  clearAuthCookies(res);
  res.json({ message: 'Logged out' });
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: serializeUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get('/users', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ users: users.map(serializeUser) });
  } catch (err) {
    next(err);
  }
});

export default router;
