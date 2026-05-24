import type { NormalizedAlert } from './normalizer.js';
import { upsertExternalAlerts, logFetch } from './normalizer.js';

const USGS_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson';

const PH_BBOX = { minLat: 4, maxLat: 21, minLon: 116, maxLon: 127 };

export async function fetchUsgsPhEarthquakes(): Promise<NormalizedAlert[]> {
  const res = await fetch(USGS_URL);
  if (!res.ok) throw new Error(`USGS feed failed: ${res.status}`);
  const data = (await res.json()) as {
    features: {
      id: string;
      properties: {
        title: string;
        mag: number;
        time: number;
        place: string;
        url: string;
      };
    }[];
  };

  return data.features
    .filter((f) => {
      const [lon, lat] = f.properties ? (f as { geometry?: { coordinates: number[] } }).geometry?.coordinates ?? [] : [];
      if (lat === undefined || lon === undefined) return false;
      return (
        lat >= PH_BBOX.minLat &&
        lat <= PH_BBOX.maxLat &&
        lon >= PH_BBOX.minLon &&
        lon <= PH_BBOX.maxLon
      );
    })
    .map((f) => {
      const p = f.properties;
      const mag = p.mag ?? 0;
      return {
        provider: 'usgs' as const,
        externalId: f.id,
        title: p.title ?? `M${mag} earthquake`,
        summary: `${p.place} — magnitude ${mag}. USGS early detection; verify with PHIVOLCS for official PH intensities.`,
        category: 'disaster' as const,
        severity: mag >= 6 ? ('critical' as const) : mag >= 5 ? ('high' as const) : ('medium' as const),
        issuedAt: new Date(p.time),
        rawPayload: p,
      };
    });
}

export async function runUsgsFetch() {
  try {
    const res = await fetch(USGS_URL);
    if (!res.ok) throw new Error(`USGS feed failed: ${res.status}`);
    const data = (await res.json()) as {
      features: {
        id: string;
        geometry: { coordinates: number[] };
        properties: { title: string; mag: number; time: number; place: string; url: string };
      }[];
    };

    const alerts: NormalizedAlert[] = data.features
      .filter((f) => {
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length < 2) return false;
        const [lon, lat] = coords;
        if (lat === undefined || lon === undefined) return false;
        return (
          lat >= PH_BBOX.minLat &&
          lat <= PH_BBOX.maxLat &&
          lon >= PH_BBOX.minLon &&
          lon <= PH_BBOX.maxLon
        );
      })
      .map((f) => {
        const p = f.properties;
        const mag = p.mag ?? 0;
        return {
          provider: 'usgs' as const,
          externalId: f.id,
          title: p.title ?? `M${mag} earthquake`,
          summary: `${p.place} — magnitude ${mag}. USGS early detection; verify with PHIVOLCS.`,
          category: 'disaster' as const,
          severity: mag >= 6 ? ('critical' as const) : mag >= 5 ? ('high' as const) : ('medium' as const),
          issuedAt: new Date(p.time),
          rawPayload: p,
        };
      });

    const count = await upsertExternalAlerts(alerts);
    await logFetch('usgs', 'ok', count);
    return count;
  } catch (err) {
    await logFetch('usgs', 'error', 0, err instanceof Error ? err.message : 'Unknown');
    throw err;
  }
}
