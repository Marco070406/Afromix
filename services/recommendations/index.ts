import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";
import type { MixSummary, TrackSummary, ArtistSummary } from "@/types/api";
import { artistSelect } from "@/lib/selectors";

const CACHE_TTL = 10 * 60; // 10 minutes

const mixSelect = {
  id: true, slug: true, title: true, coverUrl: true,
  audioUrl: true, durationSec: true, genre: true, mixType: true,
  playCount: true, likeCount: true, publishedAt: true,
  artist: { select: artistSelect },
} as const;

const trackSelect = {
  id: true, slug: true, title: true, coverUrl: true,
  audioUrl: true, durationSec: true, genre: true, trackType: true,
  bpm: true, key: true, playCount: true, likeCount: true, publishedAt: true,
  artist: { select: artistSelect },
} as const;

// ─── Types de réponse ────────────────────────────────────────────────────────

export interface RecommendationsResult {
  mixes: MixSummary[];
  tracks: TrackSummary[];
  artists: ArtistSummary[];
}

// ─── Trending ─────────────────────────────────────────────────────────────────

export async function getTrending(limit = 20): Promise<MixSummary[]> {
  const cacheKey = `trending:mixes:${limit}`;
  const cached = await cacheGet<MixSummary[]>(cacheKey);
  if (cached) return cached;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const topMixIds = await prisma.streamEvent
    .groupBy({
      by: ["mixId"],
      where: { mixId: { not: null }, createdAt: { gte: sevenDaysAgo } },
      _count: { mixId: true },
      orderBy: { _count: { mixId: "desc" } },
      take: limit,
    })
    .then((g: Array<{ mixId: string | null }>) =>
      g.map((x) => x.mixId).filter((id): id is string => !!id)
    );

  const where = {
    status: "PUBLISHED" as const,
    ...(topMixIds.length > 0 && { id: { in: topMixIds } }),
  };

  const mixes = await prisma.mix.findMany({
    where,
    take: limit,
    orderBy: topMixIds.length > 0 ? undefined : { playCount: "desc" },
    select: mixSelect,
  });

  const ordered = topMixIds.length > 0
    ? topMixIds.map((id: string) => mixes.find((m: typeof mixes[number]) => m.id === id)).filter(Boolean) as typeof mixes
    : mixes;

  const result = ordered.map((m: typeof mixes[number]) => ({
    ...m,
    publishedAt: m.publishedAt?.toISOString() ?? null,
  }));

  await cacheSet(cacheKey, result, CACHE_TTL);
  return result as MixSummary[];
}

// ─── Recommandations personnalisées ───────────────────────────────────────────

export async function getRecommendations(
  userId: string,
  limit = 20
): Promise<RecommendationsResult> {
  const cacheKey = `recommendations:${userId}:${limit}`;
  const cached = await cacheGet<RecommendationsResult>(cacheKey);
  if (cached) return cached;

  // Genres aimés
  const likedGenresRaw = await prisma.like.findMany({
    where: { userId, targetType: "MIX" },
    select: { mix: { select: { genre: true } } },
    take: 50,
  });
  const likedGenres: string[] = [
    ...new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (likedGenresRaw as any[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((l: any) => l.mix?.genre as string | undefined)
        .filter((g): g is string => !!g)
    ),
  ];

  // IDs déjà likés (à exclure)
  const likedMixIds: string[] = await prisma.like
    .findMany({ where: { userId, targetType: "MIX" }, select: { mixId: true } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then((r: any[]) => r.map((x: any) => x.mixId).filter((id: any): id is string => !!id));

  // Artistes suivis
  const followedArtistUserIds: string[] = await prisma.follow
    .findMany({ where: { followerId: userId }, select: { followingId: true } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then((r: any[]) => r.map((x: any) => x.followingId));

  const [mixes, tracks, artists] = await Promise.all([
    // Mixes dans les genres aimés, excluant ceux déjà likés
    prisma.mix.findMany({
      where: {
        status: "PUBLISHED",
        ...(likedGenres.length > 0 && { genre: { in: likedGenres as never[] } }),
        ...(likedMixIds.length > 0 && { id: { notIn: likedMixIds } }),
      },
      take: limit,
      orderBy: [{ playCount: "desc" }, { publishedAt: "desc" }],
      select: mixSelect,
    }),

    // Tracks des artistes suivis
    prisma.track.findMany({
      where: {
        status: "PUBLISHED",
        ...(followedArtistUserIds.length > 0 && {
          artist: { userId: { in: followedArtistUserIds } },
        }),
        ...(likedGenres.length > 0 && { genre: { in: likedGenres as never[] } }),
      },
      take: Math.ceil(limit / 2),
      orderBy: { publishedAt: "desc" },
      select: trackSelect,
    }),

    // Artistes similaires à ceux suivis (même pays ou genres)
    followedArtistUserIds.length > 0
      ? prisma.artistProfile.findMany({
          where: {
            userId: { notIn: followedArtistUserIds },
            ...(likedGenres.length > 0 && { genres: { hasSome: likedGenres } }),
          },
          take: 10,
          orderBy: { followerCount: "desc" },
          select: artistSelect,
        })
      : prisma.artistProfile.findMany({
          take: 10,
          orderBy: { followerCount: "desc" },
          select: artistSelect,
        }),
  ]);

  const result: RecommendationsResult = {
    mixes: mixes.map((m: typeof mixes[number]) => ({
      ...m,
      publishedAt: m.publishedAt?.toISOString() ?? null,
    })) as MixSummary[],
    tracks: tracks.map((t: typeof tracks[number]) => ({
      ...t,
      publishedAt: t.publishedAt?.toISOString() ?? null,
    })) as TrackSummary[],
    artists: artists as ArtistSummary[],
  };

  await cacheSet(cacheKey, result, CACHE_TTL);
  return result;
}

// ─── Similar Artists ──────────────────────────────────────────────────────────

/**
 * Retourne des artistes similaires à un artiste donné (par slug).
 * Similarité = genres en commun + même pays/région.
 * Exclut les artistes déjà suivis par l'utilisateur (si userId fourni).
 */
export async function getSimilarArtists(
  slug: string,
  limit = 10,
  userId?: string
): Promise<ArtistSummary[]> {
  const cacheKey = `similar:artists:${slug}:${limit}:${userId ?? "anon"}`;
  const cached = await cacheGet<ArtistSummary[]>(cacheKey);
  if (cached) return cached;

  const source = await prisma.artistProfile.findUnique({
    where: { slug },
    select: { id: true, genres: true, country: true },
  });
  if (!source) return [];

  // IDs déjà suivis (à exclure)
  const followedIds: string[] = userId
    ? await prisma.follow
        .findMany({ where: { followerId: userId }, select: { followingId: true } })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((r: any[]) => r.map((x: any) => x.followingId as string))
    : [];

  const artists = await prisma.artistProfile.findMany({
    where: {
      id: { not: source.id },
      userId: followedIds.length > 0 ? { notIn: followedIds } : undefined,
      OR: [
        // Même pays
        ...(source.country ? [{ country: source.country }] : []),
        // Au moins un genre en commun
        ...(source.genres.length > 0
          ? [{ genres: { hasSome: source.genres } }]
          : []),
      ],
    },
    take: limit * 2, // over-fetch pour trier par score
    orderBy: { followerCount: "desc" },
    select: artistSelect,
  });

  type ArtistWithGenres = typeof artists[number];
  type ScoredArtist = { artist: ArtistWithGenres; score: number };

  const scored: ScoredArtist[] = artists.map((a: ArtistWithGenres) => {
    const commonGenres = a.genres.filter((g: string) =>
      source.genres.includes(g)
    ).length;
    const countryBonus = a.country === source.country ? 2 : 0;
    return { artist: a, score: commonGenres + countryBonus };
  });

  const result = scored
    .sort((a: ScoredArtist, b: ScoredArtist) => b.score - a.score)
    .slice(0, limit)
    .map((s: ScoredArtist) => s.artist as ArtistSummary);

  await cacheSet(cacheKey, result, CACHE_TTL);
  return result;
}

// ─── Similar Mixes ────────────────────────────────────────────────────────────

/**
 * Retourne des mixes similaires à un mix donné (par slug).
 * Similarité = même genre + même mixType.
 * Exclut les mixes déjà écoutés par l'utilisateur.
 */
export async function getSimilarMixes(
  slug: string,
  limit = 10,
  userId?: string
): Promise<MixSummary[]> {
  const cacheKey = `similar:mixes:${slug}:${limit}:${userId ?? "anon"}`;
  const cached = await cacheGet<MixSummary[]>(cacheKey);
  if (cached) return cached;

  const source = await prisma.mix.findUnique({
    where: { slug },
    select: { id: true, genre: true, mixType: true, tags: true, artistId: true },
  });
  if (!source) return [];

  // IDs déjà écoutés (stream events du user)
  const listenedIds: string[] = userId
    ? await prisma.streamEvent
        .findMany({
          where: { userId, mixId: { not: null } },
          select: { mixId: true },
          distinct: ["mixId"],
          take: 200,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((r: any[]) => r.map((x: any) => x.mixId as string).filter(Boolean))
    : [];

  const mixes = await prisma.mix.findMany({
    where: {
      id: { not: source.id },
      status: "PUBLISHED",
      genre: source.genre,
      ...(listenedIds.length > 0 && { id: { notIn: listenedIds } }),
    },
    take: limit * 2,
    orderBy: [{ playCount: "desc" }, { publishedAt: "desc" }],
    select: mixSelect,
  });

  type MixRow = typeof mixes[number];
  type ScoredMix = { mix: MixRow; score: number };

  const scored: ScoredMix[] = mixes.map((m: MixRow) => {
    const mixTypeBonus = (m.mixType as string) === (source.mixType as string) ? 2 : 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sameArtistPenalty = (m as any).artistId === source.artistId ? -1 : 0;
    return { mix: m, score: mixTypeBonus + sameArtistPenalty };
  });

  const result = scored
    .sort((a: ScoredMix, b: ScoredMix) => b.score - a.score)
    .slice(0, limit)
    .map((s: ScoredMix) => ({
      ...(s.mix as MixRow),
      publishedAt: (s.mix as MixRow).publishedAt?.toISOString() ?? null,
    })) as MixSummary[];

  await cacheSet(cacheKey, result, CACHE_TTL);
  return result;
}

// ─── Trending by country ──────────────────────────────────────────────────────

/**
 * Trending filtré par pays — basé sur les stream events géolocalisés.
 * Fallback : trending global si pas assez de données locales.
 */
export async function getTrendingByCountry(
  country: string,
  limit = 20
): Promise<MixSummary[]> {
  const cacheKey = `trending:country:${country}:${limit}`;
  const cached = await cacheGet<MixSummary[]>(cacheKey);
  if (cached) return cached;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Mixes les plus écoutés depuis ce pays
  const topIds = await prisma.streamEvent
    .groupBy({
      by: ["mixId"],
      where: {
        mixId: { not: null },
        country,
        createdAt: { gte: sevenDaysAgo },
      },
      _count: { mixId: true },
      orderBy: { _count: { mixId: "desc" } },
      take: limit,
    })
    .then((g: Array<{ mixId: string | null }>) =>
      g.map((x) => x.mixId).filter((id): id is string => !!id)
    );

  // Fallback : si moins de 5 résultats locaux, complète avec trending global
  if (topIds.length < 5) {
    return getTrending(limit);
  }

  const mixes = await prisma.mix.findMany({
    where: { id: { in: topIds }, status: "PUBLISHED" },
    select: mixSelect,
  });

  // Préserve l'ordre trending
  const ordered = topIds
    .map((id: string) =>
      mixes.find((m: typeof mixes[number]) => m.id === id)
    )
    .filter(Boolean) as typeof mixes;

  const result = ordered.map((m: typeof mixes[number]) => ({
    ...m,
    publishedAt: m.publishedAt?.toISOString() ?? null,
  })) as MixSummary[];

  await cacheSet(cacheKey, result, 5 * 60); // 5 minutes
  return result;
}

// ─── For You Feed ─────────────────────────────────────────────────────────────

export interface ForYouFeed {
  mixes: MixSummary[];
  tracks: TrackSummary[];
  artists: ArtistSummary[];
  reason: {
    basedOnFollows: boolean;
    basedOnListens: boolean;
    basedOnLikes: boolean;
    topGenres: string[];
  };
}

/**
 * Feed "Pour toi" — combine plusieurs signaux avec pondération :
 * - Nouveautés des artistes suivis (poids 3)
 * - Mixes dans les genres les plus écoutés (poids 2)
 * - Mixes likés similaires (poids 1)
 * - Exclut tout contenu déjà écouté ou liké
 */
export async function getForYouFeed(
  userId: string,
  limit = 20
): Promise<ForYouFeed> {
  const cacheKey = `foryou:${userId}:${limit}`;
  const cached = await cacheGet<ForYouFeed>(cacheKey);
  if (cached) return cached;

  // ── Collecte des signaux ──────────────────────────────────────────────────

  const [
    followedArtistIdsRaw,
    listenedMixIdsRaw,
    likedMixIdsRaw,
    listenGenresRaw,
  ] = await Promise.all([
    // Artistes suivis
    prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
      take: 100,
    }),

    // Mixes écoutés
    prisma.streamEvent.findMany({
      where: { userId, mixId: { not: null } },
      select: { mixId: true },
      distinct: ["mixId"],
      take: 200,
    }),

    // Mixes likés
    prisma.like.findMany({
      where: { userId, targetType: "MIX" },
      select: { mixId: true },
      take: 100,
    }),

    // Genres des 30 derniers streams
    prisma.streamEvent.findMany({
      where: { userId, mixId: { not: null } },
      select: { mix: { select: { genre: true } } },
      take: 30,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const followedUserIds = followedArtistIdsRaw.map((f: any) => f.followingId as string);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listenedIds = listenedMixIdsRaw.map((s: any) => s.mixId as string).filter(Boolean);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const likedIds = likedMixIdsRaw.map((l: any) => l.mixId as string).filter(Boolean);
  const excludeIds = [...new Set([...listenedIds, ...likedIds])];

  // Genres les plus fréquents dans l'historique d'écoute
  const genreFreq: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const s of listenGenresRaw as any[]) {
    const g = s.mix?.genre as string | undefined;
    if (g) genreFreq[g] = (genreFreq[g] ?? 0) + 1;
  }
  const topGenres = Object.entries(genreFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g);

  const basedOnFollows = followedUserIds.length > 0;
  const basedOnListens = topGenres.length > 0;
  const basedOnLikes = likedIds.length > 0;

  // ── Requêtes ─────────────────────────────────────────────────────────────

  const [fromFollows, fromGenres, similarArtists] = await Promise.all([
    // Nouveautés des artistes suivis
    basedOnFollows
      ? prisma.mix.findMany({
          where: {
            status: "PUBLISHED",
            artist: { userId: { in: followedUserIds } },
            ...(excludeIds.length > 0 && { id: { notIn: excludeIds } }),
          },
          take: Math.ceil(limit * 0.5),
          orderBy: { publishedAt: "desc" },
          select: mixSelect,
        })
      : Promise.resolve([] as typeof mixSelect extends object ? never[] : never[]),

    // Mixes dans les genres aimés (hors déjà vus)
    basedOnListens
      ? prisma.mix.findMany({
          where: {
            status: "PUBLISHED",
            genre: { in: topGenres as never[] },
            ...(excludeIds.length > 0 && { id: { notIn: excludeIds } }),
            ...(followedUserIds.length > 0 && {
              artist: { userId: { notIn: followedUserIds } },
            }),
          },
          take: Math.ceil(limit * 0.5),
          orderBy: [{ playCount: "desc" }, { publishedAt: "desc" }],
          select: mixSelect,
        })
      : Promise.resolve([] as typeof mixSelect extends object ? never[] : never[]),

    // Artistes à découvrir (non suivis, genres similaires)
    prisma.artistProfile.findMany({
      where: {
        ...(followedUserIds.length > 0 && {
          userId: { notIn: followedUserIds },
        }),
        ...(topGenres.length > 0 && { genres: { hasSome: topGenres } }),
      },
      take: 6,
      orderBy: { followerCount: "desc" },
      select: artistSelect,
    }),
  ]);

  // Fusionne et déduplique
  const allMixIds = new Set<string>();
  const mixes: MixSummary[] = [];

  for (const m of [...(fromFollows as typeof fromFollows), ...(fromGenres as typeof fromGenres)]) {
    const typed = m as typeof mixSelect extends object ? (typeof fromFollows)[number] : never;
    if (!allMixIds.has(typed.id)) {
      allMixIds.add(typed.id);
      mixes.push({
        ...(typed as object),
        publishedAt: (typed as { publishedAt?: Date | null }).publishedAt?.toISOString() ?? null,
      } as MixSummary);
      if (mixes.length >= limit) break;
    }
  }

  const result: ForYouFeed = {
    mixes,
    tracks: [],  // TODO: ajouter tracks des artistes suivis (phase suivante)
    artists: similarArtists as ArtistSummary[],
    reason: {
      basedOnFollows,
      basedOnListens,
      basedOnLikes,
      topGenres,
    },
  };

  await cacheSet(cacheKey, result, CACHE_TTL);
  return result;
}
