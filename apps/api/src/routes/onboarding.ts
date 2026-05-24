import { Router, type Router as RouterType } from 'express';
import {
  ONBOARDING_STEPS,
  ONBOARDING_CONTENT,
  completeOnboardingStepSchema,
} from '@sis/shared';
import { prisma } from '../lib/prisma.js';
import { routeParam } from '../lib/params.js';
import { isOnboardingComplete } from '../lib/admissions-utils.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router: RouterType = Router();

router.get('/me', authenticate, authorize('student'), async (req, res, next) => {
  try {
    const completed = await prisma.onboardingStep.findMany({
      where: { userId: req.user!.userId },
    });
    const completedKeys = new Set(completed.map((s) => s.stepKey));

    res.json({
      steps: ONBOARDING_STEPS.map((key) => {
        const row = completed.find((s) => s.stepKey === key);
        return {
          key,
          completed: completedKeys.has(key),
          completedAt: row?.completedAt.toISOString() ?? null,
        };
      }),
      content: ONBOARDING_CONTENT,
      complete: completedKeys.size >= ONBOARDING_STEPS.length,
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/me/steps/:stepKey/complete',
  authenticate,
  authorize('student'),
  validateBody(completeOnboardingStepSchema),
  async (req, res, next) => {
    try {
      const stepKey = routeParam(req.params.stepKey);
      if (!ONBOARDING_STEPS.includes(stepKey as (typeof ONBOARDING_STEPS)[number])) {
        res.status(400).json({ error: 'Invalid onboarding step' });
        return;
      }

      if (stepKey === 'agreement' && !req.body.signedName?.trim()) {
        res.status(400).json({ error: 'Signed name is required for agreement step' });
        return;
      }

      await prisma.onboardingStep.upsert({
        where: { userId_stepKey: { userId: req.user!.userId, stepKey } },
        create: { userId: req.user!.userId, stepKey },
        update: { completedAt: new Date() },
      });

      const complete = await isOnboardingComplete(req.user!.userId);
      res.json({ stepKey, complete });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
