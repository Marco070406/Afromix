import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";
import { Prisma } from "@prisma/client";

const CACHE_TTL = 5 * 60; // 5 minutes

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Résout l'artistProfileId depuis un userId */
async function resolveArtistId(userId: string): Promise<string | null> {
  const profile = await prisma.artistProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

function periodToDays(period: "7d" | "30d" | "90d" | "1y"): number {
  return { "7d": 7, "30d": 30, "90d": 90, "1y": 365 }[period];
}

type Granularity = "day" | "week" | "month";
type Period = "7d" | "30d" | "90d" | "1y";

// ─── Overview ─────────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  totalPlays: number;
  totalLikes: number;
  totalComments: number;
  totalFollowers: number;
  totalMixes: number;
  totalTracks: number;
  // Variation vs période précédente (en %)
  playsGrowth: number | null;
  followersGrowth: number | null;
}

const EMPTY_OVERVIEW: AnalyticsOverview = {
  totalPlays: 0, totalLikes: 0, totalComments: 0,
  totalFollowers: 0, totalMixes: 0, totalTracks: 0,
  playsGrowth: null, followersGrowth: null,
};

export async function getOverview(
  userId: string,
  period: Period = "30d"
): Promise<AnalyticsOverview> {
  const cacheKey = `analytics:overview:${userId}:${period}`;
  const cached = await cacheGet<AnalyticsOverview>(cacheKey);
  if (cached) return cached;

  const artistId = await resolveArtistId(userId);
  if (!artistId) return EMPTY_OVERVIEW;

  const days = periodToDays(period);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const prevSince = new Date(Date.now() - 2 * days * 24 * 60 * 60 * 1000);

  const [
    mixAgg,
    trackAgg,
    commentAgg,
    profile,
    totalMixes,
    totalTracks,
    prevPlays,
  ] = await Promise.all([
    prisma.mix.aggregate({
      where: { artistId, status: "PUBLISHED" },
      _sum: { playCount: true, likeCount: true },
    }),
    prisma.track.aggregate({
      where: { artistId, status: "PUBLISHED" },
      _sum: { playCount: true, likeCount: true },
    }),
    prisma.comment.count({
      where: {
        OR: [
          { mix: { artistId } },
          { track: { artistId } },
        ],
      },
    }),
    prisma.artistProfile.findUnique({
      where: { id: artistId },
      select: { followerCount: true },
    }),
    prisma.mix.count({ where: { artistId, status: "PUBLISHED" } }),
    prisma.track.count({ where: { artistId, status: "PUBLISHED" } }),
    // Plays sur la période précédente (pour le calcul de croissance)
    prisma.streamEvent.count({
      where: {
        createdAt: { gte: prevSince, lt: since },
        OR: [{ mix: { artistId } }, { track: { artistId } }],
      },
    }),
  ]);

  // Plays de la période actuelle
  const currentPlays = await prisma.streamEvent.count({
    where: {
      createdAt: { gte: since },
      OR: [{ mix: { artistId } }, { track: { artistId } }],
    },
  });

  const totalPlays =
    Number(mixAgg._sum.playCount ?? 0) + Number(trackAgg._sum.playCount ?? 0);
  const totalLikes =
    Number(mixAgg._sum.likeCount ?? 0) + Number(trackAgg._sum.likeCount ?? 0);
  const totalFollowers = profile?.followerCount ?? 0;

  // Calcul de croissance en %
  const playsGrowth =
    prevPlays > 0
      ? Math.round(((currentPlays - prevPlays) / prevPlays) * 100)
      : null;

  const result: AnalyticsOverview = {
    totalPlays,
    totalLikes,
    totalComments: commentAgg,
    totalFollowers,
    totalMixes,
    totalTracks,
    playsGrowth,
    followersGrowth: null, // nécessite historique followers — TODO phase 12
  };

  await cacheSet(cacheKey, result, CACHE_TTL);
  return result;
}

// ─── Plays timeseries ─────────────────────────────────────────────────────────

export interface PlaysDataPoint {
  date: string;
  mixes: number;
  tracks: number;
  total: number;
}

export async function getPlaysSeries(
  userId: string,
  period: Period = "30d",
  granularity?: Granularity
): Promise<PlaysDataPoint[]> {
  // Choisit la granularité automatiquement si non fournie
  const gran: Granularity =
    granularity ??
    (period === "7d" ? "day" : period === "30d" ? "day" : period === "90d" ? "week" : "month");

  const cacheKey = `analytics:plays:${userId}:${period}:${gran}`;
  const cached = await cacheGet<PlaysDataPoint[]>(cacheKey);
  if (cached) return cached;

  const artistId = await resolveArtistId(userId);
  if (!artistId) return [];

  const days = periodToDays(period);

  // Requête SQL brute pour les agrégations temporelles
  type DateCountRow = { date: string; count: bigint };

  // gran est validé par Zod en amont : "day" | "week" | "month" → sûr
  // On utilise Prisma.raw() car DATE_TRUNC attend un littéral SQL, pas un paramètre
  const granLiteral = gran === "day" ? "day" : gran === "week" ? "week" : "month";
  const granSafe = Prisma.raw(`'${granLiteral}'`);

  const mixRowsRaw = await prisma.$queryRaw`
    SELECT
      DATE_TRUNC(${granSafe}, se."createdAt")::date::text AS date,
      COUNT(*) AS count
    FROM stream_events se
    JOIN mixes m ON m.id = se."mixId"
    WHERE m."artistId" = ${artistId}
      AND se."createdAt" >= NOW() - (${days} || ' days')::interval
    GROUP BY 1
    ORDER BY 1
  `;
  const trackRowsRaw = await prisma.$queryRaw`
    SELECT
      DATE_TRUNC(${granSafe}, se."createdAt")::date::text AS date,
      COUNT(*) AS count
    FROM stream_events se
    JOIN tracks t ON t.id = se."trackId"
    WHERE t."artistId" = ${artistId}
      AND se."createdAt" >= NOW() - (${days} || ' days')::interval
    GROUP BY 1
    ORDER BY 1
  `;

  const mixRows = mixRowsRaw as DateCountRow[];
  const trackRows = trackRowsRaw as DateCountRow[];

  const dates = new Set([
    ...mixRows.map((r: DateCountRow) => r.date),
    ...trackRows.map((r: DateCountRow) => r.date),
  ]);

  const mixMap = new Map(mixRows.map((r: DateCountRow) => [r.date, Number(r.count)]));
  const trackMap = new Map(trackRows.map((r: DateCountRow) => [r.date, Number(r.count)]));

  const result: PlaysDataPoint[] = [...dates].sort().map((date) => {
    const mixes: number = mixMap.get(date) ?? 0;
    const tracks: number = trackMap.get(date) ?? 0;
    return { date, mixes, tracks, total: mixes + tracks };
  });

  await cacheSet(cacheKey, result, CACHE_TTL);
  return result;
}

// ─── Top content ──────────────────────────────────────────────────────────────

export interface TopContentItem {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  audioUrl?: string | null;
  durationSec?: number | null;
  genre: string;
  playCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string | null;
  type: "mix" | "track";
}

export async function getTopContent(
  userId: string,
  limit = 10,
  sortBy: "playCount" | "likeCount" | "commentCount" = "playCount"
): Promise<{ mixes: TopContentItem[]; tracks: TopContentItem[] }> {
  const cacheKey = `analytics:top:${userId}:${limit}:${sortBy}`;
  const cached = await cacheGet<{ mixes: TopContentItem[]; tracks: TopContentItem[] }>(cacheKey);
  if (cached) return cached;

  const artistId = await resolveArtistId(userId);
  if (!artistId) return { mixes: [], tracks: [] };

  const [mixes, tracks] = await Promise.all([
    prisma.mix.findMany({
      where: { artistId, status: "PUBLISHED" },
      orderBy: { [sortBy]: "desc" },
      take: limit,
      select: {
        id: true, slug: true, title: true, coverUrl: true,
        audioUrl: true, durationSec: true,
        genre: true, playCount: true, likeCount: true,
        commentCount: true, publishedAt: true,
      },
    }),
    prisma.track.findMany({
      where: { artistId, status: "PUBLISHED" },
      orderBy: { [sortBy]: "desc" },
      take: limit,
      select: {
        id: true, slug: true, title: true, coverUrl: true,
        audioUrl: true, durationSec: true,
        genre: true, playCount: true, likeCount: true,
        commentCount: true, publishedAt: true,
      },
    }),
  ]);

  const result = {
    mixes: mixes.map((m: typeof mixes[number]) => ({
      ...m,
      genre: m.genre as string,
      publishedAt: m.publishedAt?.toISOString() ?? null,
      type: "mix" as const,
    })),
    tracks: tracks.map((t: typeof tracks[number]) => ({
      ...t,
      genre: t.genre as string,
      publishedAt: t.publishedAt?.toISOString() ?? null,
      type: "track" as const,
    })),
  };

  await cacheSet(cacheKey, result, CACHE_TTL);
  return result;
}

// ─── Audience ─────────────────────────────────────────────────────────────────

export interface AudienceData {
  byCountry: Array<{ country: string; plays: number; pct: number }>;
  byCity: Array<{ city: string; country: string; plays: number; pct: number }>;
  peakHours: Array<{ hour: number; plays: number }>;
  uniqueListeners: number;
  avgListenDurationMs: number;
  period: string;
}

export async function getAudience(
  userId: string,
  period: Period = "30d"
): Promise<AudienceData> {
  const cacheKey = `analytics:audience:${userId}:${period}`;
  const cached = await cacheGet<AudienceData>(cacheKey);
  if (cached) return cached;

  const artistId = await resolveArtistId(userId);
  if (!artistId) return { byCountry: [], byCity: [], peakHours: [], uniqueListeners: 0, avgListenDurationMs: 0, period };

  const days = periodToDays(period);

  type CountryRow = { country: string | null; count: bigint };
  type CityRow = { city: string | null; country: string | null; count: bigint };
  type HourRow = { hour: number; count: bigint };
  type CountRow = { count: bigint };
  type AvgRow = { avg: number | null };

  const [countryRowsRaw, cityRowsRaw, peakHoursRaw, listenerRowsRaw, durationRowRaw] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        COALESCE(se."country", 'Unknown') AS country,
        COUNT(*) AS count
      FROM stream_events se
      LEFT JOIN mixes m ON m.id = se."mixId"
      LEFT JOIN tracks t ON t.id = se."trackId"
      WHERE (m."artistId" = ${artistId} OR t."artistId" = ${artistId})
        AND se."createdAt" >= NOW() - (${days} || ' days')::interval
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 20
    `,
    prisma.$queryRaw`
      SELECT
        COALESCE(se."city", 'Unknown') AS city,
        COALESCE(se."country", 'Unknown') AS country,
        COUNT(*) AS count
      FROM stream_events se
      LEFT JOIN mixes m ON m.id = se."mixId"
      LEFT JOIN tracks t ON t.id = se."trackId"
      WHERE (m."artistId" = ${artistId} OR t."artistId" = ${artistId})
        AND se."createdAt" >= NOW() - (${days} || ' days')::interval
        AND se."city" IS NOT NULL
      GROUP BY 1, 2
      ORDER BY count DESC
      LIMIT 30
    `,
    prisma.$queryRaw`
      SELECT
        EXTRACT(HOUR FROM se."createdAt") AS hour,
        COUNT(*) AS count
      FROM stream_events se
      LEFT JOIN mixes m ON m.id = se."mixId"
      LEFT JOIN tracks t ON t.id = se."trackId"
      WHERE (m."artistId" = ${artistId} OR t."artistId" = ${artistId})
        AND se."createdAt" >= NOW() - (${days} || ' days')::interval
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT COALESCE(se."userId"::text, se."ipHash")) AS count
      FROM stream_events se
      LEFT JOIN mixes m ON m.id = se."mixId"
      LEFT JOIN tracks t ON t.id = se."trackId"
      WHERE (m."artistId" = ${artistId} OR t."artistId" = ${artistId})
        AND se."createdAt" >= NOW() - (${days} || ' days')::interval
    `,
    prisma.$queryRaw`
      SELECT AVG(se."durationMs") AS avg
      FROM stream_events se
      LEFT JOIN mixes m ON m.id = se."mixId"
      LEFT JOIN tracks t ON t.id = se."trackId"
      WHERE (m."artistId" = ${artistId} OR t."artistId" = ${artistId})
        AND se."createdAt" >= NOW() - (${days} || ' days')::interval
        AND se."durationMs" > 0
    `,
  ]);

  const countryRows = countryRowsRaw as CountryRow[];
  const cityRows = cityRowsRaw as CityRow[];
  const peakHours = peakHoursRaw as HourRow[];
  const listenerRows = listenerRowsRaw as CountRow[];
  const durationRow = durationRowRaw as AvgRow[];

  const totalPlays = countryRows.reduce(
    (s: number, r: CountryRow) => s + Number(r.count),
    0
  );
  const totalCityPlays = cityRows.reduce(
    (s: number, r: CityRow) => s + Number(r.count),
    0
  );

  const result: AudienceData = {
    byCountry: countryRows.map((r: CountryRow) => ({
      country: r.country ?? "Unknown",
      plays: Number(r.count),
      pct: totalPlays > 0 ? Math.round((Number(r.count) / totalPlays) * 100) : 0,
    })),
    byCity: cityRows.map((r: CityRow) => ({
      city: r.city ?? "Unknown",
      country: r.country ?? "Unknown",
      plays: Number(r.count),
      pct: totalCityPlays > 0 ? Math.round((Number(r.count) / totalCityPlays) * 100) : 0,
    })),
    peakHours: Array.from({ length: 24 }, (_, i) => {
      const found = peakHours.find((h: HourRow) => Number(h.hour) === i);
      return { hour: i, plays: found ? Number(found.count) : 0 };
    }),
    uniqueListeners: Number(listenerRows[0]?.count ?? 0),
    avgListenDurationMs: Math.round(Number(durationRow[0]?.avg ?? 0)),
    period,
  };

  await cacheSet(cacheKey, result, CACHE_TTL);
  return result;
}

// ─── Legacy (rétrocompat avec /api/v1/analytics) ─────────────────────────────

export async function getArtistAnalytics(userId: string) {
  const [overview, topContent, playsSeries] = await Promise.all([
    getOverview(userId, "30d"),
    getTopContent(userId, 5, "playCount"),
    getPlaysSeries(userId, "30d", "day"),
  ]);

  return {
    ...overview,
    topMixes: topContent.mixes,
    playsByDay: playsSeries,
  };
}
