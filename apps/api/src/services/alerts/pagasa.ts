import Parser from 'rss-parser';
import type { NormalizedAlert } from './normalizer.js';
import { upsertExternalAlerts, logFetch } from './normalizer.js';

const PAGASA_RSS = 'https://bagong.pagasa.dost.gov.ph/index.php?format=feed&type=atom';

function inferSeverity(title: string, summary: string): NormalizedAlert['severity'] {
  const text = `${title} ${summary}`.toLowerCase();
  if (text.includes('signal no. 4') || text.includes('signal no. 5') || text.includes('typhoon')) {
    return 'critical';
  }
  if (text.includes('signal no. 3') || text.includes('gale') || text.includes('heavy rainfall')) {
    return 'high';
  }
  if (text.includes('signal no. 2') || text.includes('tropical cyclone')) {
    return 'medium';
  }
  return 'low';
}

function inferCategory(title: string, summary: string): NormalizedAlert['category'] {
  const text = `${title} ${summary}`.toLowerCase();
  if (text.includes('signal') || text.includes('typhoon') || text.includes('cyclone')) {
    return 'no_classes';
  }
  return 'disaster';
}

export async function fetchPagasaAlerts(): Promise<NormalizedAlert[]> {
  const parser = new Parser();
  const feed = await parser.parseURL(PAGASA_RSS);
  return (feed.items ?? []).slice(0, 20).map((item) => {
    const title = item.title ?? 'PAGASA bulletin';
    const summary = item.contentSnippet ?? item.summary ?? title;
    const issuedAt = item.isoDate ? new Date(item.isoDate) : new Date();
    const externalId = item.id ?? item.link ?? `${title}-${issuedAt.toISOString()}`;
    return {
      provider: 'pagasa' as const,
      externalId: String(externalId).slice(0, 200),
      title,
      summary: summary.slice(0, 2000),
      category: inferCategory(title, summary),
      severity: inferSeverity(title, summary),
      issuedAt,
      rawPayload: { link: item.link, title, summary },
    };
  });
}

export async function runPagasaFetch() {
  try {
    const alerts = await fetchPagasaAlerts();
    const count = await upsertExternalAlerts(alerts);
    await logFetch('pagasa', 'ok', count);
    return count;
  } catch (err) {
    await logFetch('pagasa', 'error', 0, err instanceof Error ? err.message : 'Unknown');
    throw err;
  }
}
