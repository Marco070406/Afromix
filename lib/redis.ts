import Redis from "ioredis";

// ─── Singleton ────────────────────────────────────────────────────────────────

const globalForRedis = globalThis as unknown as {
  redis: Redis | null | undefined;
};

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    // Redis est optionnel — le cache et le rate limiting seront désactivés
    // tant que REDIS_URL n'est pas configuré.
    if (process.env.NODE_ENV === "production") {
      console.warn("[Redis] REDIS_URL is not set — cache and rate limiting disabled.");
    }
    return null;
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  client.on("error", (err) => {
    console.error("[Redis] Connection error:", err);
  });

  return client;
}

export const redis: Redis | null =
  globalForRedis.redis !== undefined
    ? globalForRedis.redis
    : createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

/**
 * Get a cached value. Returns null on miss, error, or when Redis is unavailable.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Set a cached value with optional TTL in seconds (default: 5 minutes).
 * No-op when Redis is unavailable.
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 300
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Non-blocking — cache failures should not crash the app
  }
}

/**
 * Delete one or more cache keys. No-op when Redis is unavailable.
 */
export async function cacheDel(...keys: string[]): Promise<void> {
  if (!redis) return;
  try {
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // Non-blocking
  }
}

/**
 * Invalidate all keys matching a pattern. No-op when Redis is unavailable.
 */
export async function cacheDelPattern(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );
      cursor = nextCursor;
      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== "0");
  } catch {
    // Non-blocking
  }
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

// Repli en mémoire quand Redis est absent ou en panne : la limitation reste active
// (par instance du serveur — suffisant en dev et pour un seul serveur).
const memoryBuckets = new Map<string, { count: number; expiresAt: number }>();

function memoryRateLimit(windowKey: string, limit: number, windowSeconds: number, resetAt: number) {
  const now = Date.now();
  if (memoryBuckets.size > 10_000) {
    for (const [k, v] of memoryBuckets) if (v.expiresAt <= now) memoryBuckets.delete(k);
  }
  const bucket = memoryBuckets.get(windowKey);
  const count = bucket && bucket.expiresAt > now ? bucket.count + 1 : 1;
  memoryBuckets.set(windowKey, { count, expiresAt: now + windowSeconds * 1000 });
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt };
}

/** IP du client : premier maillon de x-forwarded-for (posé par le proxy/hébergeur), sinon x-real-ip. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}

/**
 * Limiteur à fenêtre fixe. Utilise Redis, sinon un compteur en mémoire.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const resetAt = (Math.floor(now / windowSeconds) + 1) * windowSeconds;

  const windowKey = `rl:${key}:${Math.floor(now / windowSeconds)}`;

  if (!redis) return memoryRateLimit(windowKey, limit, windowSeconds, resetAt);

  try {
    const count = await redis.incr(windowKey);
    if (count === 1) {
      await redis.expire(windowKey, windowSeconds);
    }
    const remaining = Math.max(0, limit - count);
    return { allowed: count <= limit, remaining, resetAt };
  } catch {
    return memoryRateLimit(windowKey, limit, windowSeconds, resetAt);
  }
}
