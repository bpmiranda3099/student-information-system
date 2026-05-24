import { Router, type Router as RouterType } from 'express';
import { prisma } from '../lib/prisma.js';
import { checkStorageHealth } from '../lib/storage.js';
import { checkGeminiHealth } from '../lib/gemini.js';
import { checkResendHealth } from '../lib/resend.js';

const router: RouterType = Router();
const VERSION = process.env.npm_package_version ?? '1.0.0';

router.get('/', async (_req, res) => {
  const timestamp = new Date().toISOString();
  let dbStatus = 'ok';
  let dbLatency: number | undefined;

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - start;
  } catch {
    dbStatus = 'error';
  }

  const [storage, gemini, resend] = await Promise.all([
    checkStorageHealth(),
    checkGeminiHealth(),
    checkResendHealth(),
  ]);

  const checks = {
    database: { status: dbStatus, latencyMs: dbLatency },
    storage,
    gemini,
    resend,
  };

  const statuses = Object.values(checks).map((c) => c.status);
  const overall = statuses.every((s) => s === 'ok')
    ? 'healthy'
    : statuses.some((s) => s === 'error')
      ? 'unhealthy'
      : 'degraded';

  const statusCode = overall === 'unhealthy' ? 503 : 200;

  res.status(statusCode).json({
    status: overall,
    timestamp,
    checks,
    version: VERSION,
  });
});

export default router;
