import "server-only";

interface Bucket {
  count: number;
  reset: number;
}

const buckets = new Map<string, Bucket>();

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

/** Fixed-window in-memory limiter (per server instance) — enough for a personal deployment. */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  return { ok: b.count <= limit, retryAfter: Math.ceil((b.reset - now) / 1000) };
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(data, { status, headers });
}

/**
 * Optional shared secret. When ARISE_ACCESS_CODE is set on the server, AI
 * routes require the same code in the `x-arise-code` header, so a public URL
 * can't burn through the API key.
 */
export function checkAccess(req: Request): Response | null {
  const expected = process.env.ARISE_ACCESS_CODE;
  if (!expected) return null;
  if (req.headers.get("x-arise-code") === expected) return null;
  return json({ error: "access_code", message: "Code d'accès ARISE requis (Réglages → IA)." }, 401);
}

export function guard(req: Request, name: string, limit: number, windowMs = 60_000): Response | null {
  const denied = checkAccess(req);
  if (denied) return denied;
  const { ok, retryAfter } = rateLimit(`${name}:${clientIp(req)}`, limit, windowMs);
  if (!ok) return json({ error: "rate_limited", message: "Trop de requêtes, réessaie dans un instant." }, 429, { "Retry-After": String(retryAfter) });
  return null;
}
