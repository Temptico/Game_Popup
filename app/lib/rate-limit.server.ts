/**
 * Per-visitor request limits for the storefront endpoints, so a script can't
 * flood a shop with fake sign-ups (customers) or farm discount codes.
 *
 * Fixed one-hour windows, kept in memory: the app runs as a single machine,
 * and a restart only resets the counters. Limits are generous because mobile
 * carriers put many real shoppers behind one IP address.
 */
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, { count: number; resetAt: number }>();
let lastSweep = Date.now();

/** The shopper's IP: Shopify's app proxy puts it first in X-Forwarded-For. */
export function clientIp(request: Request): string | null {
  const first = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || null;
}

/** Counts one request; false once `max` requests were made in the current hour. */
export function allow(key: string, max: number, now = Date.now()): boolean {
  if (now - lastSweep > WINDOW_MS) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    lastSweep = now;
  }
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}
