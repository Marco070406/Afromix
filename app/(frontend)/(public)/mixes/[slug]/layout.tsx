import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { publicContent } from "@/lib/selectors";

// La page est un composant client : son titre et son aperçu de partage sont définis ici
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const mix = await prisma.mix.findFirst({
      where: { slug, ...publicContent },
      select: { title: true, description: true, coverUrl: true, artist: { select: { stageName: true } } },
    });
    if (!mix) return { title: "Mix introuvable", robots: { index: false } };

    const title = `${mix.title} — ${mix.artist.stageName}`;
    const description = mix.description ?? `Écoutez « ${mix.title} » par ${mix.artist.stageName} sur AfroMix.`;
    const images = mix.coverUrl ? [mix.coverUrl] : undefined;
    return {
      title,
      description,
      openGraph: { title, description, images, type: "music.song" },
      twitter: { card: "summary_large_image", title, description, images },
    };
  } catch {
    return {};
  }
}

export default function MixLayout({ children }: { children: React.ReactNode }) {
  return children;
}
