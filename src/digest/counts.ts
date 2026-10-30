import type { DigestNight } from './types.js';

export type NightCounts = { ok: number; retry: number; fail: number };

// Counts of log lines by status for the whole night.
export function countNight(night: DigestNight): NightCounts {
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const r of night.rows) {
    counts.retry += r.retries;
    counts.fail += r.fails;
    counts.ok += r.runs - r.retries - r.fails;
  }
  return counts;
}
