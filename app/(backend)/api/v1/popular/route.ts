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
  type: z.enum(["mixes", "tracks", "artists", "all"]).default("all"),
  sortBy: z.enum(["playCount", "likeCount", "followerCount"]).default("playCount"),
});

// GET /api/v1/popular — contenu le plus populaire (all-time)
export async function GET(request: NextRequest): Promise<Response> {
  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(raw);
  const { limit, genre, type, sortBy } = parsed.success
    ? parsed.data
    : { limit: 20, genre: undefined, type: "all" as const, sortBy: "playCount" as const };

  const cacheKey = `popular:${limit}:${genre ?? "all"}:${type}:${sortBy}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return ok(cached);

  try {
    const [mixes, tracks, artists] = await Promise.all([
      (type === "all" || type === "mixes")
        ? prisma.mix.findMany({
            where: { status: "PUBLISHED", ...(genre && { genre }) },
            take: limit,
            orderBy: { [sortBy === "followerCount" ? "playCount" : sortBy]: "desc" },
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
            where: { status: "PUBLISHED", ...(genre && { genre }) },
            take: limit,
            orderBy: { [sortBy === "followerCount" ? "playCount" : sortBy]: "desc" },
            select: {
              id: true, slug: true, title: true, coverUrl: true,
              audioUrl: true, durationSec: true, genre: true, trackType: true,
              bpm: true, playCount: true, likeCount: true, publishedAt: true,
              artist: { select: artistSelect },
            },
          })
        : Promise.resolve([]),

      (type === "all" || type === "artists")
        ? prisma.artistProfile.findMany({
            where: { ...(genre && { genres: { has: genre } }) },
            take: limit,
            orderBy: { followerCount: "desc" },
            select: artistSelect,
          })
        : Promise.resolve([]),
    ]);

    const result = {
      mixes: mixes.map((m: typeof mixes[number]) => ({ ...m, publishedAt: m.publishedAt?.toISOString() ?? null })),
      tracks: tracks.map((t: typeof tracks[number]) => ({ ...t, publishedAt: t.publishedAt?.toISOString() ?? null })),
      artists,
    };

    await cacheSet(cacheKey, result, 15 * 60); // 15 min
    return ok(result);
  } catch (err) {
    console.error("[GET /api/v1/popular]", err);
    return serverError();
  }
}
