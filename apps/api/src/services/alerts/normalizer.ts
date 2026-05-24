import { createHash } from 'crypto';
import { prisma } from '../../lib/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';

type ExternalAlertProvider = 'pagasa' | 'usgs' | 'phivolcs' | 'ndrrmc' | 'ph_holidays';
type AnnouncementCategory = 'news' | 'no_classes' | 'disaster' | 'holiday';
type AnnouncementSeverity = 'low' | 'medium' | 'high' | 'critical';

export type NormalizedAlert = {
  provider: ExternalAlertProvider;
  externalId: string;
  title: string;
  summary: string;
  category: AnnouncementCategory;
  severity: AnnouncementSeverity;
  issuedAt: Date;
  rawPayload: unknown;
};

export function dedupeHash(alert: NormalizedAlert) {
  return createHash('sha256')
    .update(`${alert.provider}:${alert.externalId}:${alert.title}`)
    .digest('hex');
}

export async function upsertExternalAlerts(alerts: NormalizedAlert[]) {
  let count = 0;
  for (const alert of alerts) {
    await prisma.externalAlert.upsert({
      where: {
        provider_externalId: { provider: alert.provider, externalId: alert.externalId },
      },
      create: {
        provider: alert.provider,
        externalId: alert.externalId,
        title: alert.title,
        summary: alert.summary,
        category: alert.category,
        severity: alert.severity,
        issuedAt: alert.issuedAt,
        rawPayload: alert.rawPayload as Prisma.InputJsonValue,
        dedupeHash: dedupeHash(alert),
      },
      update: {
        title: alert.title,
        summary: alert.summary,
        category: alert.category,
        severity: alert.severity,
        issuedAt: alert.issuedAt,
        rawPayload: alert.rawPayload as Prisma.InputJsonValue,
        dedupeHash: dedupeHash(alert),
      },
    });
    count++;
  }
  return count;
}

export async function logFetch(
  provider: ExternalAlertProvider,
  status: string,
  fetchedCount: number,
  error?: string,
) {
  await prisma.alertFetchLog.create({
    data: { provider, status, fetchedCount, error },
  });
}
