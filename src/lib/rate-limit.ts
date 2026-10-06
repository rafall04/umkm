/**
 * Rate limiter in-memory (sliding window) — cukup untuk deploy
 * single-instance (PM2 fork). Untuk multi-instance, pindahkan ke
 * store bersama (Redis/dll).
 */

const buckets = new Map<string, number[]>();
const MAX_KEYS = 10_000;

/** true = boleh lanjut; false = melebihi limit */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > MAX_KEYS) buckets.clear();
  return true;
}
