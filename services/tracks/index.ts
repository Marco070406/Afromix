import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis";
import { artistSelect } from "@/services/mixes";
import { notifyFollowersNewTrack } from "@/services/notifications";
import type { CreateTrackInput, UpdateTrackInput, TrackQuery } from "@/lib/validations/track";
import type { TrackDetail, TrackSummary, PaginatedResponse } from "@/types/api";

const CACHE_TTL = 60;
const CACHE_TTL_DETAIL = 300;

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listTracks(
  query: TrackQuery
): Promise<PaginatedResponse<TrackSummary>> {
  const cacheKey = `tracks:list:${JSON.stringify(query)}`;
  const cached = await cacheGet<PaginatedResponse<TrackSummary>>(cacheKey);
  if (cached) return cached;

  const { page, pageSize, genre, trackType, status, artistId, albumId, q, sortBy, order } = query;
  const skip = (page - 1) * pageSize;

  const where = {
    status: status ?? ("PUBLISHED" as const),
    ...(genre && { genre }),
    ...(trackType && { trackType }),
    ...(artistId && { artistId }),
    ...(albumId && { albumId }),
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
    prisma.track.count({ where }),
    prisma.track.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      select: {
        id: true, slug: true, title: true, coverUrl: true,
        audioUrl: true, durationSec: true, genre: true,
        trackType: true, bpm: true, key: true,
        playCount: true, likeCount: true, publishedAt: true,
        artist: { select: artistSelect },
      },
    }),
  ]);

  const result: PaginatedResponse<TrackSummary> = {
    items: rows.map(serializeTrackSummary),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };

  await cacheSet(cacheKey, result, CACHE_TTL);
  return result;
}

// ─── Detail by slug ───────────────────────────────────────────────────────────

export async function getTrackBySlug(slug: string): Promise<TrackDetail | null> {
  const cacheKey = `tracks:detail:${slug}`;
  const cached = await cacheGet<TrackDetail>(cacheKey);
  if (cached) return cached;

  const track = await prisma.track.findUnique({
    where: { slug },
    include: {
      artist: { select: artistSelect },
      album: {
        select: { id: true, slug: true, title: true, coverUrl: true },
      },
    },
  });

  if (!track) return null;

  const result = serializeTrackDetail(track);
  await cacheSet(cacheKey, result, CACHE_TTL_DETAIL);
  return result;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createTrack(
  artistId: string,
  input: CreateTrackInput
): Promise<TrackDetail> {
  const slug = generateSlug(input.title);

  const track = await prisma.track.create({
    data: {
      artistId,
      title: input.title,
      slug,
      description: input.description,
      genre: input.genre,
      trackType: input.trackType,
      tags: input.tags,
      albumId: input.albumId,
      bpm: input.bpm,
      key: input.key,
      lyrics: input.lyrics,
      audioKey: input.audioKey,
      coverUrl: input.coverUrl,
      durationSec: input.durationSec,
    },
    include: {
      artist: { select: artistSelect },
      album: { select: { id: true, slug: true, title: true, coverUrl: true } },
    },
  });

  await cacheDel("tracks:list:*");

  // Notifie les followers si le morceau est créé directement en statut PUBLISHED
  if (track.status === "PUBLISHED") {
    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id: artistId },
      select: { userId: true, stageName: true, avatarUrl: true },
    });
    if (artistProfile) {
      notifyFollowersNewTrack(
        artistProfile.userId,
        artistProfile.stageName,
        artistProfile.avatarUrl,
        track.title,
        track.slug
      ).catch(() => {});
    }
  }

  return serializeTrackDetail(track);
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateTrack(
  id: string,
  artistId: string,
  input: UpdateTrackInput,
  isAdmin = false
): Promise<TrackDetail> {
  const where = isAdmin ? { id } : { id, artistId };
  const existing = await prisma.track.findFirst({ where });
  if (!existing) {
    throw Object.assign(new Error("Track not found or not owned by artist"), { status: 404 });
  }

  const track = await prisma.track.update({
    where: { id },
    data: {
      ...(input.title != null && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.genre != null && { genre: input.genre }),
      ...(input.trackType != null && { trackType: input.trackType }),
      ...(input.tags != null && { tags: input.tags }),
      ...(input.albumId !== undefined && { albumId: input.albumId }),
      ...(input.bpm !== undefined && { bpm: input.bpm }),
      ...(input.key !== undefined && { key: input.key }),
      ...(input.lyrics !== undefined && { lyrics: input.lyrics }),
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
      album: { select: { id: true, slug: true, title: true, coverUrl: true } },
    },
  });

  await cacheDel(`tracks:detail:${track.slug}`);

  // Notifie les followers si le morceau vient d'être publié pour la 1ère fois
  if (input.status === "PUBLISHED" && !existing.publishedAt) {
    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id: artistId },
      select: { userId: true, stageName: true, avatarUrl: true },
    });
    if (artistProfile) {
      notifyFollowersNewTrack(
        artistProfile.userId,
        artistProfile.stageName,
        artistProfile.avatarUrl,
        track.title,
        track.slug
      ).catch(() => {});
    }
  }

  return serializeTrackDetail(track);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTrack(
  id: string,
  artistId: string,
  isAdmin = false
): Promise<void> {
  const where = isAdmin ? { id } : { id, artistId };
  const existing = await prisma.track.findFirst({ where });
  if (!existing) {
    throw Object.assign(new Error("Track not found or not owned by artist"), { status: 404 });
  }
  await prisma.track.delete({ where: { id } });
  await cacheDel(`tracks:detail:${existing.slug}`);
}

// ─── Record play ──────────────────────────────────────────────────────────────

export async function recordTrackPlay(
  trackId: string,
  userId?: string,
  country?: string
): Promise<void> {
  await prisma.$transaction([
    prisma.track.update({
      where: { id: trackId },
      data: { playCount: { increment: 1 } },
    }),
    prisma.streamEvent.create({
      data: {
        trackId,
        userId: userId ?? null,
        country: country ?? null,
        durationMs: 0,
      },
    }),
  ]);
}

// ─── Serialisers ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeTrackSummary(row: any): TrackSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    coverUrl: row.coverUrl,
    audioUrl: row.audioUrl,
    durationSec: row.durationSec,
    genre: row.genre,
    trackType: row.trackType,
    bpm: row.bpm,
    key: row.key,
    playCount: row.playCount,
    likeCount: row.likeCount,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    artist: row.artist,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeTrackDetail(row: any): TrackDetail {
  return {
    ...serializeTrackSummary(row),
    description: row.description ?? null,
    tags: row.tags ?? [],
    lyrics: row.lyrics ?? null,
    commentCount: row.commentCount ?? 0,
    album: row.album ?? null,
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
