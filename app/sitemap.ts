import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { activeArtist, publicContent } from "@/lib/selectors";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://afromix.vercel.app";
const STATIC_PAGES = ["", "/explore", "/trending", "/charts", "/artists", "/events", "/terms"];

// Régénéré au plus une fois par heure
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = STATIC_PAGES.map((path) => ({ url: `${BASE_URL}${path}` }));

  try {
    const [mixes, artists, events, playlists] = await Promise.all([
      prisma.mix.findMany({ where: publicContent, select: { slug: true, updatedAt: true } }),
      prisma.artistProfile.findMany({ where: activeArtist, select: { slug: true, updatedAt: true } }),
      prisma.event.findMany({ where: { status: "APPROVED" }, select: { id: true, updatedAt: true } }),
      prisma.playlist.findMany({ where: { isPublic: true, user: { deletedAt: null } }, select: { id: true, updatedAt: true } }),
    ]);
    return [
      ...pages,
      ...mixes.map((m) => ({ url: `${BASE_URL}/mixes/${m.slug}`, lastModified: m.updatedAt })),
      ...artists.map((a) => ({ url: `${BASE_URL}/artists/${a.slug}`, lastModified: a.updatedAt })),
      ...events.map((e) => ({ url: `${BASE_URL}/events/${e.id}`, lastModified: e.updatedAt })),
      ...playlists.map((p) => ({ url: `${BASE_URL}/playlists/${p.id}`, lastModified: p.updatedAt })),
    ];
  } catch (err) {
    // Base indisponible : les pages fixes restent indexables
    console.error("[sitemap]", err);
    return pages;
  }
}
