/**
 * POST /api/v1/artists/[slug]/banner/confirm
 * Persiste bannerUrl sur le profil après upload direct sur R2/S3.
 */

import { cdnUrl, deleteStoredUrl, objectExists } from "@/lib/storage";
import { updateArtistProfile } from "@/services/users";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/response";
import { z } from "zod";
import { storageKey } from "@/lib/validations/upload";

const confirmSchema = z.object({
  key: storageKey("banners"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const own = await prisma.artistProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true, slug: true },
  });
  // Un admin peut agir sur n'importe quel profil, même sans profil artiste à lui
  if (!own && session.role !== "ADMIN") return forbidden("No artist profile found for this account");
  if (own?.slug !== slug && session.role !== "ADMIN") {
    return forbidden("Cannot modify another artist's profile");
  }

  const target = own && own.slug === slug
    ? own
    : await prisma.artistProfile.findUnique({ where: { slug }, select: { id: true } });
  if (!target) return notFound("Artist not found");

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    if (!(await objectExists(parsed.data.key))) return badRequest("Fichier introuvable : relancez l'envoi.");
    const previous = await prisma.artistProfile.findUnique({ where: { id: target.id }, select: { bannerUrl: true } });
    const bannerUrl = cdnUrl(parsed.data.key);
    const artist = await updateArtistProfile(target.id, { bannerUrl });
    await deleteStoredUrl(previous?.bannerUrl);
    return ok({ bannerUrl: artist.bannerUrl });
  } catch (err) {
    console.error("[POST /api/v1/artists/[slug]/banner/confirm]", err);
    return serverError();
  }
}
