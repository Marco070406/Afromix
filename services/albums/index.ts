import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis";
import { artistSelect } from "@/services/mixes";
import type { CreateAlbumInput, UpdateAlbumInput, AlbumQuery } from "@/lib/validations/album";
import type { AlbumDetail, AlbumSummary, PaginatedResponse } from "@/types/api";

const CACHE_TTL = 60;
const CACHE_TTL_DETAIL = 300;

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listAlbums(
  query: AlbumQuery
): Promise<PaginatedResponse<AlbumSummary>> {
  const cacheKey = `albums:list:${JSON.stringify(query)}`;
  const cached = await cacheGet<PaginatedResponse<AlbumSummary>>(cacheKey);
  if (cached) return cached;

  const { page, pageSize, genre, status, artistId, q, sortBy, order } = query;
  const skip = (page - 1) * pageSize;

  const where = {
    status: status ?? ("PUBLISHED" as const),
    ...(genre && { genre }),
    ...(artistId && { artistId }),
    ...(q && {
      title: { contains: q, mode: "insensitive" as const },
    }),
  };

  const orderBy = { [sortBy ?? "releaseDate"]: order ?? "desc" };

  const [total, rows] = await Promise.all([
    prisma.album.count({ where }),
    prisma.album.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      select: {
        id: true, slug: true, title: true, coverUrl: true,
        genre: true, releaseDate: true, trackCount: true,
        likeCount: true, publishedAt: true,
        artist: { select: artistSelect },
      },
    }),
  ]);

  const result: PaginatedResponse<AlbumSummary> = {
    items: rows.map(serializeAlbumSummary),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };

  await cacheSet(cacheKey, result, CACHE_TTL);
  return result;
}

// ─── Detail by slug ───────────────────────────────────────────────────────────

export async function getAlbumBySlug(slug: string): Promise<AlbumDetail | null> {
  const cacheKey = `albums:detail:${slug}`;
  const cached = await cacheGet<AlbumDetail>(cacheKey);
  if (cached) return cached;

  const album = await prisma.album.findUnique({
    where: { slug },
    include: {
      artist: { select: artistSelect },
      tracks: {
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "asc" },
        select: {
          id: true, slug: true, title: true, coverUrl: true,
          audioUrl: true, durationSec: true, genre: true,
          trackType: true, bpm: true, key: true,
          playCount: true, likeCount: true, publishedAt: true,
          artist: { select: artistSelect },
        },
      },
    },
  });

  if (!album) return null;

  const result = serializeAlbumDetail(album);
  await cacheSet(cacheKey, result, CACHE_TTL_DETAIL);
  return result;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createAlbum(
  artistId: string,
  input: CreateAlbumInput
): Promise<AlbumDetail> {
  const slug = generateSlug(input.title);

  const album = await prisma.album.create({
    data: {
      artistId,
      title: input.title,
      slug,
      description: input.description,
      genre: input.genre,
      tags: input.tags,
      releaseDate: input.releaseDate ? new Date(input.releaseDate) : null,
      coverUrl: input.coverUrl,
    },
    include: {
      artist: { select: artistSelect },
      tracks: { where: { status: "PUBLISHED" }, select: {
        id: true, slug: true, title: true, coverUrl: true,
        audioUrl: true, durationSec: true, genre: true,
        trackType: true, bpm: true, key: true,
        playCount: true, likeCount: true, publishedAt: true,
        artist: { select: artistSelect },
      }},
    },
  });

  await cacheDel("albums:list:*");
  return serializeAlbumDetail(album);
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateAlbum(
  id: string,
  artistId: string,
  input: UpdateAlbumInput,
  isAdmin = false
): Promise<AlbumDetail> {
  const where = isAdmin ? { id } : { id, artistId };
  const existing = await prisma.album.findFirst({ where });
  if (!existing) {
    throw Object.assign(new Error("Album not found or not owned by artist"), { status: 404 });
  }

  const album = await prisma.album.update({
    where: { id },
    data: {
      ...(input.title != null && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.genre != null && { genre: input.genre }),
      ...(input.tags != null && { tags: input.tags }),
      ...(input.coverUrl != null && { coverUrl: input.coverUrl }),
      ...(input.releaseDate !== undefined && {
        releaseDate: input.releaseDate ? new Date(input.releaseDate) : null,
      }),
      ...(input.status != null && { status: input.status }),
      ...(input.status === "PUBLISHED" && !existing.publishedAt && {
        publishedAt: new Date(),
      }),
    },
    include: {
      artist: { select: artistSelect },
      tracks: { where: { status: "PUBLISHED" }, select: {
        id: true, slug: true, title: true, coverUrl: true,
        audioUrl: true, durationSec: true, genre: true,
        trackType: true, bpm: true, key: true,
        playCount: true, likeCount: true, publishedAt: true,
        artist: { select: artistSelect },
      }},
    },
  });

  await cacheDel(`albums:detail:${album.slug}`);
  return serializeAlbumDetail(album);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteAlbum(
  id: string,
  artistId: string,
  isAdmin = false
): Promise<void> {
  const where = isAdmin ? { id } : { id, artistId };
  const existing = await prisma.album.findFirst({ where });
  if (!existing) {
    throw Object.assign(new Error("Album not found or not owned by artist"), { status: 404 });
  }
  // Tracks restent mais leur albumId devient null (onDelete: SetNull)
  await prisma.album.delete({ where: { id } });
  await cacheDel(`albums:detail:${existing.slug}`);
}

// ─── Serialisers ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeAlbumSummary(row: any): AlbumSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    coverUrl: row.coverUrl,
    genre: row.genre,
    releaseDate: row.releaseDate?.toISOString() ?? null,
    trackCount: row.trackCount,
    likeCount: row.likeCount,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    artist: row.artist,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeAlbumDetail(row: any): AlbumDetail {
  return {
    ...serializeAlbumSummary(row),
    description: row.description ?? null,
    tags: row.tags ?? [],
    tracks: (row.tracks ?? []).map((t: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      id: t.id, slug: t.slug, title: t.title, coverUrl: t.coverUrl,
      audioUrl: t.audioUrl, durationSec: t.durationSec,
      genre: t.genre, trackType: t.trackType, bpm: t.bpm, key: t.key,
      playCount: t.playCount, likeCount: t.likeCount,
      publishedAt: t.publishedAt?.toISOString() ?? null,
      artist: t.artist,
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
