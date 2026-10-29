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

// Repli en mémoire quand Redis est absent ou en panne : chaque instance du serveur
// garde ses propres résultats, ce qui évite déjà la plupart des allers-retours vers la base.
const MEMORY_CACHE_MAX = 500;
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

function memoryGet(key: string): string | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

function memorySet(key: string, value: string, ttlSeconds: number): void {
  if (memoryCache.size >= MEMORY_CACHE_MAX) {
    const now = Date.now();
    for (const [k, v] of memoryCache) if (v.expiresAt <= now) memoryCache.delete(k);
    // Toujours plein : on retire les entrées les plus anciennes (ordre d'insertion)
    for (const k of memoryCache.keys()) {
      if (memoryCache.size < MEMORY_CACHE_MAX) break;
      memoryCache.delete(k);
    }
  }
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/** Motif Redis (« * » seulement) vers expression régulière, pour le cache mémoire. */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

/**
 * Get a cached value. Returns null on miss or error.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = redis ? await redis.get(key) : memoryGet(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Set a cached value with optional TTL in seconds (default: 5 minutes).
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 300
): Promise<void> {
  try {
    const raw = JSON.stringify(value);
    if (redis) await redis.set(key, raw, "EX", ttlSeconds);
    else memorySet(key, raw, ttlSeconds);
  } catch {
    // Non-blocking — cache failures should not crash the app
  }
}

/**
 * Delete one or more cache keys.
 */
export async function cacheDel(...keys: string[]): Promise<void> {
  if (!redis) {
    for (const k of keys) memoryCache.delete(k);
    return;
  }
  try {
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // Non-blocking
  }
}

/**
 * Invalidate all keys matching a pattern.
 */
export async function cacheDelPattern(pattern: string): Promise<void> {
  if (!redis) {
    const re = patternToRegex(pattern);
    for (const k of memoryCache.keys()) if (re.test(k)) memoryCache.delete(k);
    return;
  }
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

/**
 * Limite des routes d'écriture : renvoie une réponse 429 prête à être retournée,
 * ou null si la requête peut passer. `who` = identifiant de session, sinon IP.
 */
export async function limitOrNull(
  scope: string,
  who: string,
  limit: number,
  windowSeconds: number
): Promise<Response | null> {
  const { allowed, resetAt } = await rateLimit(`${scope}:${who}`, limit, windowSeconds);
  if (allowed) return null;
  const retryAfter = Math.max(1, resetAt - Math.floor(Date.now() / 1000));
  return Response.json(
    { success: false, error: "Trop de requêtes, réessayez dans quelques instants." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}
