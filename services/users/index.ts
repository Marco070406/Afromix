import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis";
import { artistSelect, artistDetailSelect } from "@/lib/selectors";
import type {
  ArtistDetail,
  ArtistSummary,
  MixSummary,
  PaginatedResponse,
} from "@/types/api";
import type {
  UpdateArtistProfileInput,
  ArtistQuery,
} from "@/lib/validations/user";

const CACHE_TTL = 300; // 5 minutes

// artistSummarySelect est maintenant artistSelect depuis lib/selectors
// artistDetailSelect est importé depuis lib/selectors
// ─── List artists ─────────────────────────────────────────────────────────────

export async function listArtists(
  query: ArtistQuery
): Promise<PaginatedResponse<ArtistSummary>> {
  const { page, pageSize, q, country, genre, verified } = query;
  const cacheKey = `artists:list:${JSON.stringify(query)}`;
  const cached = await cacheGet<PaginatedResponse<ArtistSummary>>(cacheKey);
  if (cached) return cached;

  const where = {
    ...(q && {
      stageName: { contains: q, mode: "insensitive" as const },
    }),
    ...(country && { country }),
    ...(genre && { genres: { has: genre } }),
    ...(verified !== undefined && { verified }),
  };

  const [total, rows] = await Promise.all([
    prisma.artistProfile.count({ where }),
    prisma.artistProfile.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { followerCount: "desc" },
      select: artistSelect,
    }),
  ]);

  const result: PaginatedResponse<ArtistSummary> = {
    items: rows,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };

  await cacheSet(cacheKey, result, CACHE_TTL);
  return result;
}

// ─── Get artist by slug ───────────────────────────────────────────────────────

export async function getArtistBySlug(
  slug: string
): Promise<ArtistDetail | null> {
  const cacheKey = `artists:detail:${slug}`;
  const cached = await cacheGet<ArtistDetail>(cacheKey);
  if (cached) return cached;

  const row = await prisma.artistProfile.findUnique({
    where: { slug },
    select: {
      ...artistDetailSelect,
      _count: { select: { mixes: true, tracks: true } },
    },
  });

  if (!row) return null;

  const result: ArtistDetail = {
    id: row.id,
    userId: row.userId,
    slug: row.slug,
    stageName: row.stageName,
    avatarUrl: row.avatarUrl,
    bannerUrl: row.bannerUrl,
    bio: row.bio,
    country: row.country,
    city: row.city,
    website: row.website,
    instagram: row.instagram,
    soundcloud: row.soundcloud,
    twitter: row.twitter,
    youtube: row.youtube,
    tiktok: row.tiktok,
    spotify: row.spotify,
    verified: row.verified,
    verificationStatus: row.verificationStatus,
    followerCount: row.followerCount,
    genres: row.genres,
    mixCount: row._count.mixes,
    trackCount: row._count.tracks,
    bookingEmail: row.bookingEmail,
    bookingPhone: row.bookingPhone,
    bookingNotes: row.bookingNotes,
    availableForBooking: row.availableForBooking,
  };

  await cacheSet(cacheKey, result, CACHE_TTL);
  return result;
}

// ─── Get artist by userId ─────────────────────────────────────────────────────

export async function getArtistByUserId(
  userId: string
): Promise<ArtistDetail | null> {
  const row = await prisma.artistProfile.findUnique({
    where: { userId },
    select: {
      ...artistDetailSelect,
      _count: { select: { mixes: true, tracks: true } },
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    userId: row.userId,
    slug: row.slug,
    stageName: row.stageName,
    avatarUrl: row.avatarUrl,
    bannerUrl: row.bannerUrl,
    bio: row.bio,
    country: row.country,
    city: row.city,
    website: row.website,
    instagram: row.instagram,
    soundcloud: row.soundcloud,
    twitter: row.twitter,
    youtube: row.youtube,
    tiktok: row.tiktok,
    spotify: row.spotify,
    verified: row.verified,
    verificationStatus: row.verificationStatus,
    followerCount: row.followerCount,
    genres: row.genres,
    mixCount: row._count.mixes,
    trackCount: row._count.tracks,
    bookingEmail: row.bookingEmail,
    bookingPhone: row.bookingPhone,
    bookingNotes: row.bookingNotes,
    availableForBooking: row.availableForBooking,
  };
}

// ─── Update artist profile ────────────────────────────────────────────────────

export async function updateArtistProfile(
  artistId: string,
  input: UpdateArtistProfileInput
): Promise<ArtistDetail> {
  const updated = await prisma.artistProfile.update({
    where: { id: artistId },
    data: {
      ...(input.stageName != null && { stageName: input.stageName }),
      ...(input.bio !== undefined && { bio: input.bio }),
      ...(input.country !== undefined && { country: input.country }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.website !== undefined && {
        website: input.website || null,
      }),
      ...(input.instagram !== undefined && {
        instagram: input.instagram || null,
      }),
      ...(input.soundcloud !== undefined && {
        soundcloud: input.soundcloud || null,
      }),
      ...(input.twitter !== undefined && {
        twitter: input.twitter || null,
      }),
      ...(input.youtube !== undefined && {
        youtube: input.youtube || null,
      }),
      ...(input.tiktok !== undefined && {
        tiktok: input.tiktok || null,
      }),
      ...(input.spotify !== undefined && {
        spotify: input.spotify || null,
      }),
      ...(input.bookingEmail !== undefined && {
        bookingEmail: input.bookingEmail || null,
      }),
      ...(input.bookingPhone !== undefined && {
        bookingPhone: input.bookingPhone || null,
      }),
      ...(input.bookingNotes !== undefined && {
        bookingNotes: input.bookingNotes || null,
      }),
      ...(input.availableForBooking !== undefined && {
        availableForBooking: input.availableForBooking,
      }),
      ...(input.genres != null && { genres: input.genres }),
      ...(input.avatarUrl !== undefined && {
        avatarUrl: input.avatarUrl || null,
      }),
      ...(input.bannerUrl !== undefined && {
        bannerUrl: input.bannerUrl || null,
      }),
    },
    select: {
      ...artistDetailSelect,
      _count: { select: { mixes: true, tracks: true } },
    },
  });

  // Invalide le cache detail pour ce slug
  await cacheDel(`artists:detail:${updated.slug}`);

  return {
    id: updated.id,
    userId: updated.userId,
    slug: updated.slug,
    stageName: updated.stageName,
    avatarUrl: updated.avatarUrl,
    bannerUrl: updated.bannerUrl,
    bio: updated.bio,
    country: updated.country,
    city: updated.city,
    website: updated.website,
    instagram: updated.instagram,
    soundcloud: updated.soundcloud,
    twitter: updated.twitter,
    youtube: updated.youtube,
    tiktok: updated.tiktok,
    spotify: updated.spotify,
    verified: updated.verified,
    verificationStatus: updated.verificationStatus,
    followerCount: updated.followerCount,
    genres: updated.genres,
    mixCount: updated._count.mixes,
    trackCount: updated._count.tracks,
    bookingEmail: updated.bookingEmail,
    bookingPhone: updated.bookingPhone,
    bookingNotes: updated.bookingNotes,
    availableForBooking: updated.availableForBooking,
  };
}

// ─── Request verification ─────────────────────────────────────────────────────

export async function requestVerification(artistId: string): Promise<void> {
  const profile = await prisma.artistProfile.findUnique({
    where: { id: artistId },
    select: { verificationStatus: true },
  });

  if (!profile) throw Object.assign(new Error("Artist not found"), { status: 404 });

  if (profile.verificationStatus === "VERIFIED") {
    throw Object.assign(new Error("Already verified"), { status: 409 });
  }
  if (profile.verificationStatus === "PENDING") {
    throw Object.assign(new Error("Verification already pending"), { status: 409 });
  }

  await prisma.artistProfile.update({
    where: { id: artistId },
    data: { verificationStatus: "PENDING" },
  });
}

// ─── Get artist mixes ─────────────────────────────────────────────────────────

export async function getArtistMixes(
  slug: string,
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<MixSummary>> {
  // Résoud l'artistId depuis le slug
  const artist = await prisma.artistProfile.findUnique({
    where: { slug },
    select: { id: true, userId: true, slug: true, stageName: true, avatarUrl: true, country: true, verified: true, followerCount: true, genres: true },
  });
  if (!artist) throw Object.assign(new Error("Artist not found"), { status: 404 });

  const cacheKey = `artists:${slug}:mixes:${page}:${pageSize}`;
  const cached = await cacheGet<PaginatedResponse<MixSummary>>(cacheKey);
  if (cached) return cached;

  const where = { artistId: artist.id, status: "PUBLISHED" as const };

  const [total, mixes] = await Promise.all([
    prisma.mix.count({ where }),
    prisma.mix.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        coverUrl: true,
        audioUrl: true,
        durationSec: true,
        genre: true,
        mixType: true,
        playCount: true,
        likeCount: true,
        publishedAt: true,
      },
    }),
  ]);

  const result: PaginatedResponse<MixSummary> = {
    items: mixes.map((m: typeof mixes[number]) => ({
      ...m,
      genre: m.genre as string,
      publishedAt: m.publishedAt?.toISOString() ?? null,
      artist: {
        id: artist.id,
        userId: artist.userId,
        slug: artist.slug,
        stageName: artist.stageName,
        avatarUrl: artist.avatarUrl,
        country: artist.country,
        verified: artist.verified,
        followerCount: artist.followerCount,
        genres: artist.genres,
      },
    })),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };

  await cacheSet(cacheKey, result, 60);
  return result;
}
