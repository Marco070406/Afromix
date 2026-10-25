import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis";
import { artistSelect } from "@/lib/selectors";
import { notifyFollowersNewMix } from "@/services/notifications";
import type { CreateMixInput, UpdateMixInput, MixQuery } from "@/lib/validations/mix";
import type { MixDetail, MixSummary, PaginatedResponse } from "@/types/api";

// ─── Selectors ────────────────────────────────────────────────────────────────

// artistSelect re-exporté pour que d'autres services puissent l'importer
export { artistSelect };

const CACHE_TTL = 60;
const CACHE_TTL_DETAIL = 300;

const trackSelect = {
  id: true, slug: true, title: true, coverUrl: true,
  audioUrl: true, durationSec: true, genre: true,
  trackType: true, bpm: true, key: true,
  playCount: true, likeCount: true,
  artist: { select: artistSelect },
} as const;

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listMixes(
  query: MixQuery
): Promise<PaginatedResponse<MixSummary>> {
  const cacheKey = `mixes:list:${JSON.stringify(query)}`;
  const cached = await cacheGet<PaginatedResponse<MixSummary>>(cacheKey);
  if (cached) return cached;

  const { page, pageSize, genre, mixType, country, status, artistId, q, sortBy, order } = query;
  const skip = (page - 1) * pageSize;

  const isPublicListing = !status || status === "PUBLISHED";
  const where = {
    status: status ?? ("PUBLISHED" as const),
    // For public listings, only show mixes that actually have audio
    ...(isPublicListing && { audioUrl: { not: null } }),
    ...(genre && { genre }),
    ...(mixType && { mixType }),
    ...(country && { artist: { country } }),
    ...(artistId && { artistId }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
        { tags: { has: q } },
      ],
    }),
  };

  const orderBy = { [sortBy ?? "publishedAt"]: order ?? "desc" };

  const [total, rows] = await Promise.all([
    prisma.mix.count({ where }),
    prisma.mix.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      select: {
        id: true, slug: true, title: true, coverUrl: true,
        audioUrl: true, durationSec: true, genre: true,
        mixType: true, playCount: true, likeCount: true,
        publishedAt: true,
        artist: { select: artistSelect },
      },
    }),
  ]);

  const result: PaginatedResponse<MixSummary> = {
    items: rows.map(serializeMixSummary),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };

  await cacheSet(cacheKey, result, CACHE_TTL);
  return result;
}

// ─── Detail by slug ───────────────────────────────────────────────────────────

export async function getMixBySlug(slug: string, userId?: string): Promise<MixDetail | null> {
  const cacheKey = `mixes:detail:${slug}`;
  // Only cache the user-agnostic version; isLiked is user-specific
  const cached = await cacheGet<MixDetail>(cacheKey);

  let mix: Awaited<ReturnType<typeof prisma.mix.findUnique>> | null = null;

  if (!cached) {
    mix = await prisma.mix.findUnique({
      where: { slug },
      include: {
        artist: { select: artistSelect },
        tracklist: {
          orderBy: { position: "asc" },
          include: { track: { select: trackSelect } },
        },
      },
    });

    if (!mix) return null;

    const result = serializeMixDetail(mix);
    await cacheSet(cacheKey, result, CACHE_TTL_DETAIL);

    // Attach user-specific isLiked if userId provided
    if (userId) {
      const like = await prisma.like.findFirst({
        where: { userId, targetType: "MIX", mixId: mix.id },
        select: { id: true },
      });
      return { ...result, isLiked: !!like };
    }
    return result;
  }

  // Cache hit — fetch isLiked separately if needed
  if (userId) {
    const like = await prisma.like.findFirst({
      where: { userId, targetType: "MIX", mixId: cached.id },
      select: { id: true },
    });
    return { ...cached, isLiked: !!like };
  }

  return cached;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createMix(
  artistId: string,
  input: CreateMixInput
): Promise<MixDetail> {
  const slug = generateSlug(input.title);

  const mix = await prisma.mix.create({
    data: {
      artistId,
      title: input.title,
      slug,
      description: input.description,
      genre: input.genre,
      mixType: input.mixType,
      tags: input.tags,
      audioKey: input.audioKey,
      coverUrl: input.coverUrl,
      durationSec: input.durationSec,
    },
    include: {
      artist: { select: artistSelect },
      tracklist: { include: { track: { select: trackSelect } } },
    },
  });

  await cacheDel("mixes:list:*");

  // Notifie les followers si le mix est créé directement avec le statut PUBLISHED
  if (mix.status === "PUBLISHED") {
    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id: artistId },
      select: { userId: true, stageName: true, avatarUrl: true },
    });
    if (artistProfile) {
      notifyFollowersNewMix(
        artistProfile.userId,
        artistProfile.stageName,
        artistProfile.avatarUrl,
        mix.title,
        mix.slug
      ).catch(() => {});
    }
  }

  return serializeMixDetail(mix);
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateMix(
  id: string,
  artistId: string,
  input: UpdateMixInput,
  isAdmin = false
): Promise<MixDetail> {
  const where = isAdmin ? { id } : { id, artistId };
  const existing = await prisma.mix.findFirst({ where });
  if (!existing) {
    throw Object.assign(new Error("Mix not found or not owned by artist"), { status: 404 });
  }

  // Guard: cannot publish without audio
  if (input.status === "PUBLISHED" && !existing.audioUrl) {
    throw Object.assign(
      new Error("Impossible de publier un mix sans audio. Uploadez un fichier audio d'abord."),
      { status: 400 }
    );
  }

  const mix = await prisma.mix.update({
    where: { id },
    data: {
      ...(input.title != null && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.genre != null && { genre: input.genre }),
      ...(input.mixType != null && { mixType: input.mixType }),
      ...(input.tags != null && { tags: input.tags }),
      ...(input.audioKey != null && { audioKey: input.audioKey }),
      ...(input.audioUrl != null && { audioUrl: input.audioUrl }),
      ...(input.coverUrl != null && { coverUrl: input.coverUrl }),
      ...(input.durationSec != null && { durationSec: input.durationSec }),
      ...(input.status != null && { status: input.status }),
      ...(input.status === "PUBLISHED" && !existing.publishedAt && {
        publishedAt: new Date(),
      }),
    },
    include: {
      artist: { select: artistSelect },
      tracklist: {
        orderBy: { position: "asc" as const },
        include: { track: { select: trackSelect } },
      },
    },
  });

  await cacheDel(`mixes:detail:${mix.slug}`);

  // Notifie les followers si le mix vient d'être publié pour la 1ère fois
  if (input.status === "PUBLISHED" && !existing.publishedAt) {
    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id: artistId },
      select: { userId: true, stageName: true, avatarUrl: true },
    });
    if (artistProfile) {
      notifyFollowersNewMix(
        artistProfile.userId,
        artistProfile.stageName,
        artistProfile.avatarUrl,
        mix.title,
        mix.slug
      ).catch(() => {});
    }
  }

  return serializeMixDetail(mix);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteMix(
  id: string,
  artistId: string,
  isAdmin = false
): Promise<void> {
  const where = isAdmin ? { id } : { id, artistId };
  const existing = await prisma.mix.findFirst({ where });
  if (!existing) {
    throw Object.assign(new Error("Mix not found or not owned by artist"), { status: 404 });
  }
  await prisma.mix.delete({ where: { id } });
  await cacheDel(`mixes:detail:${existing.slug}`);
}

// ─── Play (stream event) ──────────────────────────────────────────────────────

export async function recordPlay(
  mixId: string,
  userId?: string,
  country?: string
): Promise<void> {
  await prisma.$transaction([
    prisma.mix.update({
      where: { id: mixId },
      data: { playCount: { increment: 1 } },
    }),
    prisma.streamEvent.create({
      data: {
        mixId,
        userId: userId ?? null,
        country: country ?? null,
        durationMs: 0, // updated client-side via heartbeat
      },
    }),
  ]);
}

// ─── Tracklist management ─────────────────────────────────────────────────────

export async function addToTracklist(
  mixId: string,
  artistId: string,
  trackId: string,
  position: number,
  startSec?: number
): Promise<void> {
  // Verify ownership
  const mix = await prisma.mix.findFirst({ where: { id: mixId, artistId } });
  if (!mix) throw Object.assign(new Error("Mix not found"), { status: 404 });

  // Shift existing items at this position down
  await prisma.tracklistItem.updateMany({
    where: { mixId, position: { gte: position } },
    data: { position: { increment: 1 } },
  });

  await prisma.tracklistItem.create({
    data: { mixId, trackId, position, startSec },
  });

  await cacheDel(`mixes:detail:${mix.slug}`);
}

export async function removeFromTracklist(
  mixId: string,
  artistId: string,
  tracklistItemId: string
): Promise<void> {
  const mix = await prisma.mix.findFirst({ where: { id: mixId, artistId } });
  if (!mix) throw Object.assign(new Error("Mix not found"), { status: 404 });

  const item = await prisma.tracklistItem.findFirst({
    where: { id: tracklistItemId, mixId },
  });
  if (!item) throw Object.assign(new Error("Tracklist item not found"), { status: 404 });

  await prisma.tracklistItem.delete({ where: { id: tracklistItemId } });

  // Re-compact positions
  const remaining = await prisma.tracklistItem.findMany({
    where: { mixId },
    orderBy: { position: "asc" },
  });
  await Promise.all(
    remaining.map((r: { id: string }, i: number) =>
      prisma.tracklistItem.update({ where: { id: r.id }, data: { position: i } })
    )
  );

  await cacheDel(`mixes:detail:${mix.slug}`);
}

// ─── Serialisers ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeMixSummary(row: any): MixSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    coverUrl: row.coverUrl,
    audioUrl: row.audioUrl,
    durationSec: row.durationSec,
    genre: row.genre,
    mixType: row.mixType,
    playCount: row.playCount,
    likeCount: row.likeCount,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    artist: row.artist,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeMixDetail(row: any): MixDetail {
  return {
    ...serializeMixSummary(row),
    description: row.description ?? null,
    tags: row.tags ?? [],
    commentCount: row.commentCount ?? 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tracklist: (row.tracklist ?? []).map((item: any) => ({
      ...item.track,
      startSec: item.startSec ?? null,
      position: item.position,
      genre: item.track?.genre ?? null,
      trackType: item.track?.trackType ?? null,
      publishedAt: item.track?.publishedAt?.toISOString() ?? null,
    })),
  };
}

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}
