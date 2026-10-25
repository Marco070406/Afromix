import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";
import { ok, serverError } from "@/lib/response";
import { z } from "zod";
import { MixGenreEnum } from "@/lib/validations/mix";
import type { NextRequest } from "next/server";
import { artistSelect } from "@/lib/selectors";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  genre: MixGenreEnum.optional(),
  type: z.enum(["mixes", "tracks", "albums", "all"]).default("all"),
  days: z.coerce.number().int().min(1).max(90).default(30),
});

// GET /api/v1/new-releases — contenu publié récemment
export async function GET(request: NextRequest): Promise<Response> {
  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(raw);
  const { limit, genre, type, days } = parsed.success
    ? parsed.data
    : { limit: 20, genre: undefined, type: "all" as const, days: 30 };

  const cacheKey = `new-releases:${limit}:${genre ?? "all"}:${type}:${days}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return ok(cached);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const [mixes, tracks, albums] = await Promise.all([
      (type === "all" || type === "mixes")
        ? prisma.mix.findMany({
            where: {
              status: "PUBLISHED",
              publishedAt: { gte: since },
              ...(genre && { genre }),
            },
            take: limit,
            orderBy: { publishedAt: "desc" },
            select: {
              id: true, slug: true, title: true, coverUrl: true,
              audioUrl: true, durationSec: true, genre: true, mixType: true,
              playCount: true, likeCount: true, publishedAt: true,
              artist: { select: artistSelect },
            },
          })
        : Promise.resolve([]),

      (type === "all" || type === "tracks")
        ? prisma.track.findMany({
            where: {
              status: "PUBLISHED",
              publishedAt: { gte: since },
              ...(genre && { genre }),
            },
            take: limit,
            orderBy: { publishedAt: "desc" },
            select: {
              id: true, slug: true, title: true, coverUrl: true,
              audioUrl: true, durationSec: true, genre: true, trackType: true,
              bpm: true, playCount: true, likeCount: true, publishedAt: true,
              artist: { select: artistSelect },
            },
          })
        : Promise.resolve([]),

      (type === "all" || type === "albums")
        ? prisma.album.findMany({
            where: {
              status: "PUBLISHED",
              publishedAt: { gte: since },
              ...(genre && { genre }),
            },
            take: limit,
            orderBy: { publishedAt: "desc" },
            select: {
              id: true, slug: true, title: true, coverUrl: true,
              genre: true, trackCount: true, releaseDate: true, publishedAt: true,
              artist: { select: artistSelect },
            },
          })
        : Promise.resolve([]),
    ]);

    const result = {
      mixes: mixes.map((m: typeof mixes[number]) => ({ ...m, publishedAt: m.publishedAt?.toISOString() ?? null })),
      tracks: tracks.map((t: typeof tracks[number]) => ({ ...t, publishedAt: t.publishedAt?.toISOString() ?? null })),
      albums: albums.map((a: typeof albums[number]) => ({
        ...a,
        releaseDate: a.releaseDate?.toISOString() ?? null,
        publishedAt: a.publishedAt?.toISOString() ?? null,
      })),
    };

    await cacheSet(cacheKey, result, 10 * 60);
    return ok(result);
  } catch (err) {
    console.error("[GET /api/v1/new-releases]", err);
    return serverError();
  }
}
