import { runPhHolidaysFetch } from './ph-holidays.js';
import { runPagasaFetch } from './pagasa.js';
import { runUsgsFetch } from './usgs.js';
import { runPhivolcsFetch } from './phivolcs.js';
import { runNdrrmcFetch } from './ndrrmc.js';

export async function syncAllExternalAlerts() {
  const results: Record<string, number | string> = {};
  const runners = [
    ['ph_holidays', runPhHolidaysFetch],
    ['pagasa', runPagasaFetch],
    ['usgs', runUsgsFetch],
    ['phivolcs', runPhivolcsFetch],
    ['ndrrmc', runNdrrmcFetch],
  ] as const;

  for (const [name, fn] of runners) {
    try {
      results[name] = await fn();
    } catch (err) {
      results[name] = err instanceof Error ? err.message : 'error';
    }
  }
  return results;
}
