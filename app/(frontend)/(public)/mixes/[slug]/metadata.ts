import type { Metadata } from "next";
import { mixesApi } from "@/app/(frontend)/lib/api/mixes";

export async function generateMixMetadata(slug: string): Promise<Metadata> {
  try {
    const res = await mixesApi.getBySlug(slug);
    const mix = res.data;
    const title = `${mix.title} — ${mix.artist.stageName}`;
    const description = mix.description ?? `Écoutez "${mix.title}" par ${mix.artist.stageName} sur AfroMix.`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: mix.coverUrl ? [{ url: mix.coverUrl, width: 1200, height: 630 }] : [],
        type: "music.song",
      },
      twitter: { card: "summary_large_image", title, description, images: mix.coverUrl ? [mix.coverUrl] : [] },
    };
  } catch {
    return { title: "Mix — AfroMix" };
  }
}
