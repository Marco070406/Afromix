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
  if (cached) return ok(cached, { cdnSeconds: 60 });

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
      // Agrégats légers d'abord, puis détail des seuls artistes retenus : on ne charge
      // jamais tous les profils avec tous leurs mixes.
      (type === "artists" || type === "all")
        ? (async () => {
            const [streamGroups, allTimeGroups, candidates] = await Promise.all([
              prisma.streamEvent.groupBy({
                by: ["mixId"],
                where: { mixId: { not: null }, createdAt: { gte: since } },
                _count: { mixId: true },
              }),
              prisma.mix.groupBy({
                by: ["artistId"],
                where: { status: "PUBLISHED" },
                _sum: { playCount: true },
              }),
              prisma.artistProfile.findMany({
                where: { ...(genre && { genres: { has: genre } }) },
                select: { id: true, followerCount: true },
              }),
            ]);

            // Écoutes de la période, ramenées à l'artiste de chaque mix publié
            const streamedIds = streamGroups.map((g) => g.mixId).filter((id): id is string => !!id);
            const streamedMixes = streamedIds.length
              ? await prisma.mix.findMany({
                  where: { id: { in: streamedIds }, status: "PUBLISHED" },
                  select: { id: true, artistId: true },
                })
              : [];
            const mixArtist = new Map(streamedMixes.map((m) => [m.id, m.artistId]));
            const periodStreams = new Map<string, number>();
            for (const g of streamGroups) {
              const artistId = g.mixId ? mixArtist.get(g.mixId) : undefined;
              if (artistId) periodStreams.set(artistId, (periodStreams.get(artistId) ?? 0) + g._count.mixId);
            }
            const allTimePlays = new Map(allTimeGroups.map((g) => [g.artistId, g._sum.playCount ?? 0]));

            const top = candidates
              .map((a) => ({
                id: a.id,
                followerCount: a.followerCount,
                score: periodStreams.get(a.id) || allTimePlays.get(a.id) || 0,
              }))
              .sort((a, b) => b.score - a.score || b.followerCount - a.followerCount)
              .slice(0, limit);

            const details = await prisma.artistProfile.findMany({
              where: { id: { in: top.map((a) => a.id) } },
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
                  take: 1,
                },
              },
            });
            const byId = new Map(details.map((a) => [a.id, a]));

            return top.flatMap(({ id, score }) => {
              const a = byId.get(id);
              if (!a) return [];
              const { mixes: topMixes, ...artist } = a;
              return [{ ...artist, monthlyPlays: score, topMix: topMixes[0] ?? null }];
            });
          })()
        : Promise.resolve([]),
    ]);

    const result = { mixes, tracks, artists, period, genre: genre ?? null };
    await cacheSet(cacheKey, result, 5 * 60); // 5 minutes
    return ok(result, { cdnSeconds: 60 });
  } catch (err) {
    console.error("[GET /api/v1/trending]", err);
    return serverError();
  }
}
