import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";
import { ok, badRequest, serverError } from "@/lib/response";
import { z } from "zod";
import { MixGenreEnum } from "@/lib/validations/mix";
import type { NextRequest } from "next/server";
import { artistSelect } from "@/lib/selectors";

const searchSchema = z.object({
  q: z.string().min(1).max(100),
  type: z.enum(["all", "mixes", "tracks", "artists", "albums"]).default("all"),
  genre: MixGenreEnum.optional(),
  subGenre: z.string().max(50).optional(),
  country: z.string().max(2).optional(),
  city: z.string().max(100).optional(),
  mixType: z.enum(["DJ_MIX", "DJ_SET", "LIVE_SET", "PODCAST"]).optional(),
  trackType: z.enum(["SINGLE", "EP", "ALBUM_TRACK", "INSTRUMENTAL", "REMIX", "FREESTYLE", "LIVE"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(20).default(10),
  sortBy: z.enum(["relevance", "playCount", "likeCount", "publishedAt"]).default("relevance"),
});

// GET /api/v1/search
export async function GET(request: NextRequest): Promise<Response> {
  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest("Invalid query params", parsed.error.flatten().fieldErrors);
  }

  // subGenre est accepté pour compatibilité mais n'existe pas dans le schéma Prisma
  const { q, type, genre, country, city, mixType, trackType, page, pageSize, sortBy } = parsed.data;
  const cacheKey = `search:${JSON.stringify(parsed.data)}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return ok(cached);

  const skip = (page - 1) * pageSize;
  // Pays et ville combinés : deux spreads "artist" successifs s'écraseraient
  const artistFilter = country || city
    ? {
        ...(country && { country }),
        ...(city && { city: { contains: city, mode: "insensitive" as const } }),
      }
    : undefined;
  const textSearch = { contains: q, mode: "insensitive" as const };
  const orderBy = sortBy === "relevance"
    ? [{ playCount: "desc" as const }, { publishedAt: "desc" as const }]
    : [{ [sortBy]: "desc" as const }];

  try {
    const [mixes, tracks, artists, albums] = await Promise.all([
      // ── Mixes ──────────────────────────────────────────────────────────────
      (type === "all" || type === "mixes")
        ? prisma.mix.findMany({
            where: {
              status: "PUBLISHED",
              ...(genre && { genre }),
              ...(mixType && { mixType }),
              ...(artistFilter && { artist: artistFilter }),
              OR: [
                { title: textSearch },
                { description: textSearch },
                { tags: { has: q } },
              ],
            },
            take: pageSize, skip,
            orderBy,
            select: {
              id: true, slug: true, title: true, coverUrl: true,
              audioUrl: true, durationSec: true, genre: true, mixType: true,
              playCount: true, likeCount: true, publishedAt: true,
              artist: { select: artistSelect },
            },
          })
        : Promise.resolve([]),

      // ── Tracks ─────────────────────────────────────────────────────────────
      (type === "all" || type === "tracks")
        ? prisma.track.findMany({
            where: {
              status: "PUBLISHED",
              ...(genre && { genre }),
              ...(trackType && { trackType }),
              ...(artistFilter && { artist: artistFilter }),
              OR: [
                { title: textSearch },
                { description: textSearch },
                { tags: { has: q } },
              ],
            },
            take: pageSize, skip,
            orderBy,
            select: {
              id: true, slug: true, title: true, coverUrl: true,
              audioUrl: true, durationSec: true, genre: true, trackType: true,
              bpm: true, key: true, playCount: true, likeCount: true,
              publishedAt: true,
              artist: { select: artistSelect },
            },
          })
        : Promise.resolve([]),

      // ── Artists ────────────────────────────────────────────────────────────
      (type === "all" || type === "artists")
        ? prisma.artistProfile.findMany({
            where: {
              ...(country && { country }),
              ...(city && { city: { contains: city, mode: "insensitive" as const } }),
              ...(genre && { genres: { has: genre } }),
              OR: [
                { stageName: textSearch },
                { bio: textSearch },
              ],
            },
            take: pageSize, skip,
            orderBy: { followerCount: "desc" },
            select: artistSelect,
          })
        : Promise.resolve([]),

      // ── Albums ─────────────────────────────────────────────────────────────
      (type === "all" || type === "albums")
        ? prisma.album.findMany({
            where: {
              status: "PUBLISHED",
              ...(genre && { genre }),
              title: textSearch,
            },
            take: pageSize, skip,
            orderBy: { publishedAt: "desc" },
            select: {
              id: true, slug: true, title: true, coverUrl: true,
              genre: true, releaseDate: true, trackCount: true,
              publishedAt: true,
              artist: { select: artistSelect },
            },
          })
        : Promise.resolve([]),
    ]);

    const result = {
      mixes: mixes.map((m: typeof mixes[number]) => ({
        ...m,
        publishedAt: m.publishedAt?.toISOString() ?? null,
      })),
      tracks: tracks.map((t: typeof tracks[number]) => ({
        ...t,
        publishedAt: t.publishedAt?.toISOString() ?? null,
      })),
      artists,
      albums: albums.map((a: typeof albums[number]) => ({
        ...a,
        releaseDate: a.releaseDate?.toISOString() ?? null,
        publishedAt: a.publishedAt?.toISOString() ?? null,
      })),
      meta: { q, type, page, pageSize },
    };

    await cacheSet(cacheKey, result, 60);
    return ok(result);
  } catch (err) {
    console.error("[GET /api/v1/search]", err);
    return serverError();
  }
}
