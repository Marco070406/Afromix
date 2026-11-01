import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { activeArtist } from "@/lib/selectors";

// La page est un composant client : son titre et son aperçu de partage sont définis ici
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const artist = await prisma.artistProfile.findFirst({
      where: { slug, ...activeArtist },
      select: { stageName: true, bio: true, avatarUrl: true, bannerUrl: true },
    });
    if (!artist) return { title: "DJ introuvable", robots: { index: false } };

    const description = artist.bio ?? `Écoutez les mixes de ${artist.stageName} et réservez ce DJ sur AfroMix.`;
    const image = artist.bannerUrl ?? artist.avatarUrl;
    const images = image ? [image] : undefined;
    return {
      title: artist.stageName,
      description,
      openGraph: { title: artist.stageName, description, images, type: "profile" },
      twitter: { card: "summary_large_image", title: artist.stageName, description, images },
    };
  } catch {
    return {};
  }
}

export default function ArtistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
