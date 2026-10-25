import { ok, serverError } from "@/lib/response";
import { cacheGet, cacheSet } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { MixGenreEnum } from "@/lib/validations/mix";
import type { NextRequest } from "next/server";
import { artistSelect } from "@/lib/selectors";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  period: z.enum(["24h", "7d", "30d"]).default("7d"),
  genre: MixGenreEnum.optional(),
  type: z.enum(["mixes", "tracks", "artists", "all"]).default("mixes"),
});

// GET /api/v1/trending
export async function GET(request: NextRequest): Promise<Response> {
  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(raw);
  const { limit, period, genre, type } = parsed.success
    ? parsed.data
    : { limit: 20, period: "7d" as const, genre: undefined, type: "mixes" as const };

  const cacheKey = `trending:${limit}:${period}:${genre ?? "all"}:${type}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return ok(cached);

  const periodMs = { "24h": 24, "7d": 168, "30d": 720 }[period] * 60 * 60 * 1000;
  const since = new Date(Date.now() - periodMs);

  try {
    const [mixes, tracks, artists] = await Promise.all([
      // ── Trending mixes ───────────────────────────────────────────────────
      (type === "mixes" || type === "all")
        ? (async () => {
            const topIds = await prisma.streamEvent
              .groupBy({
                by: ["mixId"],
                where: { mixId: { not: null }, createdAt: { gte: since } },
                _count: { mixId: true },
                orderBy: { _count: { mixId: "desc" } },
                take: limit,
              })
              .then((g: Array<{ mixId: string | null }>) =>
                g.map((x) => x.mixId).filter((id): id is string => !!id)
              );

            // Fallback : si pas encore de stream events, tri par playCount
            const where = {
              status: "PUBLISHED" as const,
              ...(genre && { genre }),
              ...(topIds.length > 0 && { id: { in: topIds } }),
            };

            const rows = await prisma.mix.findMany({
              where,
              take: limit,
              orderBy: topIds.length > 0 ? undefined : { playCount: "desc" },
              select: {
                id: true, slug: true, title: true, coverUrl: true,
                audioUrl: true, durationSec: true, genre: true, mixType: true,
                playCount: true, likeCount: true, publishedAt: true,
                artist: { select: artistSelect },
              },
            });

            // Préserve l'ordre des topIds si disponible
            const ordered = topIds.length > 0
              ? topIds.map((id: string) => rows.find((r: typeof rows[number]) => r.id === id)).filter(Boolean)
              : rows;

            return (ordered as typeof rows).map((m: typeof rows[number]) => ({
              ...m, publishedAt: m.publishedAt?.toISOString() ?? null,
            }));
          })()
        : Promise.resolve([]),

      // ── Trending tracks ──────────────────────────────────────────────────
      (type === "tracks" || type === "all")
        ? (async () => {
            const topIds = await prisma.streamEvent
              .groupBy({
                by: ["trackId"],
                where: { trackId: { not: null }, createdAt: { gte: since } },
                _count: { trackId: true },
                orderBy: { _count: { trackId: "desc" } },
                take: limit,
              })
              .then((g: Array<{ trackId: string | null }>) =>
                g.map((x) => x.trackId).filter((id): id is string => !!id)
              );

            const where = {
              status: "PUBLISHED" as const,
              ...(genre && { genre }),
              ...(topIds.length > 0 && { id: { in: topIds } }),
            };

            const rows = await prisma.track.findMany({
              where,
              take: limit,
              orderBy: topIds.length > 0 ? undefined : { playCount: "desc" },
              select: {
                id: true, slug: true, title: true, coverUrl: true,
                audioUrl: true, durationSec: true, genre: true, trackType: true,
                bpm: true, playCount: true, likeCount: true, publishedAt: true,
                artist: { select: artistSelect },
              },
            });

            const ordered = topIds.length > 0
              ? topIds.map((id: string) => rows.find((r: typeof rows[number]) => r.id === id)).filter(Boolean)
              : rows;

            return (ordered as typeof rows).map((m: typeof rows[number]) => ({
              ...m, publishedAt: m.publishedAt?.toISOString() ?? null,
            }));
          })()
        : Promise.resolve([]),

      // ── Trending artists (most listened to in period) ─────────────
      (type === "artists" || type === "all")
        ? (async () => {
            const streamGroups = await prisma.streamEvent.groupBy({
              by: ["mixId"],
              where: { mixId: { not: null }, createdAt: { gte: since } },
              _count: { mixId: true },
            });

            const mixStreamMap = new Map<string, number>();
            for (const s of streamGroups) {
              if (s.mixId) mixStreamMap.set(s.mixId, s._count.mixId);
            }

            const allArtists = await prisma.artistProfile.findMany({
              where: {
                ...(genre && { genres: { has: genre } }),
              },
              select: {
                id: true,
                userId: true,
                slug: true,
                stageName: true,
                avatarUrl: true,
                country: true,
                verified: true,
                followerCount: true,
                genres: true,
                availableForBooking: true,
                mixes: {
                  where: { status: "PUBLISHED" },
                  select: {
                    id: true,
                    slug: true,
                    title: true,
                    coverUrl: true,
                    audioUrl: true,
                    durationSec: true,
                    playCount: true,
                  },
                  orderBy: { playCount: "desc" },
                },
              },
            });

            const scored = allArtists.map((a) => {
              let periodStreams = 0;
              let allTimePlays = 0;
              for (const m of a.mixes) {
                const s = mixStreamMap.get(m.id) ?? 0;
                periodStreams += s;
                allTimePlays += m.playCount;
              }

              const score = periodStreams > 0 ? periodStreams : allTimePlays;
              const topMix = a.mixes[0]
                ? {
                    id: a.mixes[0].id,
                    slug: a.mixes[0].slug,
                    title: a.mixes[0].title,
                    coverUrl: a.mixes[0].coverUrl,
                    audioUrl: a.mixes[0].audioUrl,
                    durationSec: a.mixes[0].durationSec,
                    playCount: a.mixes[0].playCount,
                  }
                : null;

              return {
                id: a.id,
                userId: a.userId,
                slug: a.slug,
                stageName: a.stageName,
                avatarUrl: a.avatarUrl,
                country: a.country,
                verified: a.verified,
                followerCount: a.followerCount,
                genres: a.genres,
                availableForBooking: a.availableForBooking,
                monthlyPlays: score,
                topMix,
              };
            });

            scored.sort((a, b) => b.monthlyPlays - a.monthlyPlays || b.followerCount - a.followerCount);
            return scored.slice(0, limit);
          })()
        : Promise.resolve([]),
    ]);

    const result = { mixes, tracks, artists, period, genre: genre ?? null };
    await cacheSet(cacheKey, result, 5 * 60); // 5 minutes
    return ok(result);
  } catch (err) {
    console.error("[GET /api/v1/trending]", err);
    return serverError();
  }
}
