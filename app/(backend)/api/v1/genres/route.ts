import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";
import { ok, serverError } from "@/lib/response";

// Genres disponibles dans le schema
const GENRES = [
  "AFROBEATS", "AMAPIANO", "AFRO_HOUSE", "AFRO_SOUL", "BONGO_FLAVA",
  "DANCEHALL", "HIGHLIFE", "KIZOMBA", "KUDURO", "NDOMBOLO",
  "RUMBA", "SOCA", "OTHER",
] as const;

// Labels lisibles pour le frontend
const GENRE_LABELS: Record<string, string> = {
  AFROBEATS: "Afrobeats",
  AMAPIANO: "Amapiano",
  AFRO_HOUSE: "Afro House",
  AFRO_SOUL: "Afro Soul",
  BONGO_FLAVA: "Bongo Flava",
  DANCEHALL: "Dancehall",
  HIGHLIFE: "Highlife",
  KIZOMBA: "Kizomba",
  KUDURO: "Kuduro",
  NDOMBOLO: "Ndombolo",
  RUMBA: "Rumba",
  SOCA: "Soca",
  OTHER: "Autre",
};

// GET /api/v1/genres — liste des genres avec compteurs de contenu
export async function GET(): Promise<Response> {
  const cacheKey = "genres:counts";
  const cached = await cacheGet(cacheKey);
  if (cached) return ok(cached, { cdnSeconds: 600 });

  try {
    // Compte le nombre de mixes et tracks publiés par genre
    const [mixCounts, trackCounts] = await Promise.all([
      prisma.mix.groupBy({
        by: ["genre"],
        where: { status: "PUBLISHED" },
        _count: { genre: true },
      }),
      prisma.track.groupBy({
        by: ["genre"],
        where: { status: "PUBLISHED" },
        _count: { genre: true },
      }),
    ]);

    const mixMap = Object.fromEntries(
      mixCounts.map((r: { genre: string; _count: { genre: number } }) => [r.genre, r._count.genre])
    );
    const trackMap = Object.fromEntries(
      trackCounts.map((r: { genre: string; _count: { genre: number } }) => [r.genre, r._count.genre])
    );

    const genres = GENRES
      .map((g) => ({
        id: g,
        label: GENRE_LABELS[g] ?? g,
        mixCount: mixMap[g] ?? 0,
        trackCount: trackMap[g] ?? 0,
        total: (mixMap[g] ?? 0) + (trackMap[g] ?? 0),
      }))
      .filter((g) => g.total > 0 || g.id !== "OTHER") // garde OTHER même si vide
      .sort((a, b) => b.total - a.total);

    await cacheSet(cacheKey, genres, 30 * 60); // 30 minutes
    return ok(genres, { cdnSeconds: 600 });
  } catch (err) {
    console.error("[GET /api/v1/genres]", err);
    return serverError();
  }
}
