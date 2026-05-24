import * as cheerio from 'cheerio';
import type { NormalizedAlert } from './normalizer.js';
import { upsertExternalAlerts, logFetch } from './normalizer.js';

const NDRRMC_URL = 'https://ndrrmc.gov.ph/15-ndrrmc-issuances';

export async function fetchNdrrmcIssuances(): Promise<NormalizedAlert[]> {
  const res = await fetch(NDRRMC_URL, {
    headers: { 'User-Agent': 'SIS-AlertSync/1.0' },
  });
  if (!res.ok) throw new Error(`NDRRMC fetch failed: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const alerts: NormalizedAlert[] = [];

  $('a').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const title = $(el).text().trim();
    if (!title || title.length < 10) return;
    if (!/memo|advisory|issuance|sitrep|bulletin/i.test(title)) return;
    const externalId = href || title.slice(0, 120);
    alerts.push({
      provider: 'ndrrmc',
      externalId: externalId.slice(0, 200),
      title: title.slice(0, 300),
      summary: `NDRRMC issuance: ${title}`,
      category: 'disaster',
      severity: /red|critical|emergency/i.test(title) ? 'critical' : 'medium',
      issuedAt: new Date(),
      rawPayload: { href, title },
    });
  });

  return alerts.slice(0, 20);
}

export async function runNdrrmcFetch() {
  try {
    const alerts = await fetchNdrrmcIssuances();
    const count = await upsertExternalAlerts(alerts);
    await logFetch('ndrrmc', 'ok', count);
    return count;
  } catch (err) {
    await logFetch('ndrrmc', 'error', 0, err instanceof Error ? err.message : 'Unknown');
    throw err;
  }
}
