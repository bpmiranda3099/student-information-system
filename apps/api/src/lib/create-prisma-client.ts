import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

type PrismaLogLevel = 'query' | 'info' | 'warn' | 'error';

export function createPrismaClient(options?: { log?: PrismaLogLevel[] }) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log:
      options?.log ??
      (process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']),
  });
}

export type { PrismaClient } from '../generated/prisma/client.js';
export type { User } from '../generated/prisma/client.js';
