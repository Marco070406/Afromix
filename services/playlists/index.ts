import { prisma } from "@/lib/prisma";
import { cacheDel } from "@/lib/redis";
import type {
  CreatePlaylistInput,
  UpdatePlaylistInput,
  AddPlaylistItemInput,
  ReorderItemsInput,
} from "@/lib/validations/playlist";

// ─── Selectors ────────────────────────────────────────────────────────────────

const ownerSelect = {
  id: true,
  profile: { select: { displayName: true, avatarUrl: true } },
} as const;

const itemContentSelect = {
  mix: {
    select: {
      id: true, slug: true, title: true, coverUrl: true, audioUrl: true,
      genre: true, mixType: true, durationSec: true,
      playCount: true, likeCount: true, publishedAt: true,
      artist: {
        select: {
          id: true, userId: true, slug: true, stageName: true,
          avatarUrl: true, country: true, verified: true,
          followerCount: true, genres: true,
        },
      },
    },
  },
  track: {
    select: {
      id: true, slug: true, title: true, coverUrl: true, audioUrl: true,
      genre: true, trackType: true, durationSec: true, bpm: true,
      playCount: true, likeCount: true, publishedAt: true,
      artist: {
        select: {
          id: true, userId: true, slug: true, stageName: true,
          avatarUrl: true, country: true, verified: true,
          followerCount: true, genres: true,
        },
      },
    },
  },
} as const;

// ─── Serialiser ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializePlaylist(p: any, ownerId: string) {
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? null,
    coverUrl: p.coverUrl ?? null,
    isPublic: p.isPublic,
    itemCount: p._count?.items ?? p.items?.length ?? 0,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    owner: {
      id: ownerId,
      displayName: p.user?.profile?.displayName ?? null,
      avatarUrl: p.user?.profile?.avatarUrl ?? null,
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeItem(item: any) {
  return {
    id: item.id,
    position: item.position,
    addedAt: item.addedAt.toISOString(),
    mix: item.mix
      ? { ...item.mix, publishedAt: item.mix.publishedAt?.toISOString() ?? null }
      : null,
    track: item.track
      ? { ...item.track, publishedAt: item.track.publishedAt?.toISOString() ?? null }
      : null,
  };
}

// ─── Get playlist by id (avec contrôle accès) ─────────────────────────────────

export async function getPlaylist(
  id: string,
  requestingUserId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      user: { select: ownerSelect },
      _count: { select: { items: true } },
    },
  });

  if (!playlist) return null;
  // Playlist privée : seul le propriétaire peut y accéder
  if (!playlist.isPublic && playlist.userId !== requestingUserId) return null;

  return playlist;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createPlaylist(
  userId: string,
  input: CreatePlaylistInput
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const playlist = await prisma.playlist.create({
    data: { userId, ...input },
    include: {
      user: { select: ownerSelect },
      _count: { select: { items: true } },
    },
  });
  return playlist;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updatePlaylist(
  id: string,
  userId: string,
  input: UpdatePlaylistInput
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const existing = await prisma.playlist.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw Object.assign(new Error("Playlist not found or not owned"), { status: 404 });
  }

  const playlist = await prisma.playlist.update({
    where: { id },
    data: {
      ...(input.title != null && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
      ...(input.coverUrl !== undefined && { coverUrl: input.coverUrl || null }),
    },
    include: {
      user: { select: ownerSelect },
      _count: { select: { items: true } },
    },
  });

  await cacheDel(`playlist:${id}`);
  return playlist;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deletePlaylist(id: string, userId: string): Promise<void> {
  const existing = await prisma.playlist.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw Object.assign(new Error("Playlist not found or not owned"), { status: 404 });
  }
  await prisma.playlist.delete({ where: { id } });
  await cacheDel(`playlist:${id}`);
}

// ─── Get playlist with items ──────────────────────────────────────────────────

export async function getPlaylistWithItems(
  id: string,
  requestingUserId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      user: { select: ownerSelect },
      items: {
        orderBy: { position: "asc" },
        include: itemContentSelect,
      },
    },
  });

  if (!playlist) return null;
  if (!playlist.isPublic && playlist.userId !== requestingUserId) return null;

  return playlist;
}

// ─── Add item ─────────────────────────────────────────────────────────────────

export async function addPlaylistItem(
  playlistId: string,
  userId: string,
  input: AddPlaylistItemInput
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist || playlist.userId !== userId) {
    throw Object.assign(new Error("Playlist not found or not owned"), { status: 404 });
  }

  // Position auto = à la fin si non fournie
  let position = input.position;
  if (position == null) {
    const last = await prisma.playlistItem.findFirst({
      where: { playlistId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    position = (last?.position ?? -1) + 1;
  } else {
    // Shift les items existants à cette position vers le bas
    await prisma.playlistItem.updateMany({
      where: { playlistId, position: { gte: position } },
      data: { position: { increment: 1 } },
    });
  }

  const item = await prisma.playlistItem.create({
    data: {
      playlistId,
      mixId: input.mixId,
      trackId: input.trackId,
      position,
    },
    include: itemContentSelect,
  });

  await cacheDel(`playlist:${playlistId}`);
  return item;
}

// ─── Remove item ──────────────────────────────────────────────────────────────

export async function removePlaylistItem(
  playlistId: string,
  itemId: string,
  userId: string
): Promise<void> {
  const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist || playlist.userId !== userId) {
    throw Object.assign(new Error("Playlist not found or not owned"), { status: 404 });
  }

  const item = await prisma.playlistItem.findFirst({
    where: { id: itemId, playlistId },
  });
  if (!item) {
    throw Object.assign(new Error("Item not found"), { status: 404 });
  }

  await prisma.playlistItem.delete({ where: { id: itemId } });

  // Recompacte les positions
  const remaining = await prisma.playlistItem.findMany({
    where: { playlistId },
    orderBy: { position: "asc" },
    select: { id: true },
  });

  await Promise.all(
    remaining.map((r: { id: string }, i: number) =>
      prisma.playlistItem.update({ where: { id: r.id }, data: { position: i } })
    )
  );

  await cacheDel(`playlist:${playlistId}`);
}

// ─── Reorder items ────────────────────────────────────────────────────────────

export async function reorderPlaylistItems(
  playlistId: string,
  userId: string,
  input: ReorderItemsInput
): Promise<void> {
  const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist || playlist.userId !== userId) {
    throw Object.assign(new Error("Playlist not found or not owned"), { status: 404 });
  }

  // Met à jour chaque item dans une transaction
  await prisma.$transaction(
    input.items.map((item) =>
      prisma.playlistItem.updateMany({
        where: { id: item.id, playlistId },
        data: { position: item.position },
      })
    )
  );

  await cacheDel(`playlist:${playlistId}`);
}

// ─── List user playlists ──────────────────────────────────────────────────────

export async function listUserPlaylists(
  userId: string,
  page: number,
  pageSize: number,
  onlyPublic: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ items: any[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
  const where = {
    userId,
    ...(onlyPublic && { isPublic: true }),
  };

  const [total, playlists] = await Promise.all([
    prisma.playlist.count({ where }),
    prisma.playlist.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: ownerSelect },
        _count: { select: { items: true } },
      },
    }),
  ]);

  return {
    items: playlists,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export { serializePlaylist, serializeItem };
