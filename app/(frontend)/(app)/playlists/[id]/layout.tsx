import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

// La page est un composant client : son titre et son aperçu de partage sont définis ici.
// Seules les playlists publiques d'un compte actif sont décrites et indexées.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const playlist = await prisma.playlist.findFirst({
      where: { id, isPublic: true, user: { deletedAt: null } },
      select: {
        title: true,
        description: true,
        coverUrl: true,
        user: { select: { profile: { select: { displayName: true } } } },
        _count: { select: { items: true } },
      },
    });
    if (!playlist) return { title: "Playlist", robots: { index: false } };

    const owner = playlist.user.profile?.displayName ?? "AfroMix";
    const title = `${playlist.title} — playlist de ${owner}`;
    const description = playlist.description ?? `${playlist._count.items} titres à écouter sur AfroMix.`;
    const images = playlist.coverUrl ? [playlist.coverUrl] : undefined;
    return {
      title,
      description,
      openGraph: { title, description, images, type: "music.playlist" },
      twitter: { card: "summary_large_image", title, description, images },
    };
  } catch {
    return {};
  }
}

export default function PlaylistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
