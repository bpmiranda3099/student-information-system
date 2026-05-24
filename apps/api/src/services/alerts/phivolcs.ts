import * as cheerio from 'cheerio';
import type { NormalizedAlert } from './normalizer.js';
import { upsertExternalAlerts, logFetch } from './normalizer.js';

const PHIVOLCS_URL = 'https://earthquake.phivolcs.dost.gov.ph/';

export async function fetchPhivolcsEarthquakes(): Promise<NormalizedAlert[]> {
  const res = await fetch(PHIVOLCS_URL, {
    headers: { 'User-Agent': 'SIS-AlertSync/1.0' },
  });
  if (!res.ok) throw new Error(`PHIVOLCS fetch failed: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const alerts: NormalizedAlert[] = [];

  $('table tr').each((_, row) => {
    const cells = $(row)
      .find('td')
      .map((__, td) => $(td).text().trim())
      .get();
    if (cells.length < 4) return;
    const dateTime = cells[0];
    const lat = cells[1];
    const lon = cells[2];
    const depth = cells[3];
    const mag = cells[4];
    const location = cells[5] ?? 'Unknown';
    if (!dateTime || !mag) return;
    const magnitude = parseFloat(mag);
    if (Number.isNaN(magnitude) || magnitude < 4) return;

    const externalId = `phivolcs-${dateTime}-${location}`.replace(/\s+/g, '-').slice(0, 180);
    alerts.push({
      provider: 'phivolcs',
      externalId,
      title: `M${magnitude} — ${location}`,
      summary: `PHIVOLCS: ${dateTime}, depth ${depth} km at ${lat}, ${lon}. Location: ${location}`,
      category: 'disaster',
      severity: magnitude >= 6 ? 'critical' : magnitude >= 5 ? 'high' : 'medium',
      issuedAt: new Date(dateTime.replace(/\s+/g, ' ')),
      rawPayload: { dateTime, lat, lon, depth, mag, location },
    });
  });

  return alerts.slice(0, 15);
}

export async function runPhivolcsFetch() {
  try {
    const alerts = await fetchPhivolcsEarthquakes();
    const count = await upsertExternalAlerts(alerts);
    await logFetch('phivolcs', 'ok', count);
    return count;
  } catch (err) {
    await logFetch('phivolcs', 'error', 0, err instanceof Error ? err.message : 'Unknown');
    throw err;
  }
}
