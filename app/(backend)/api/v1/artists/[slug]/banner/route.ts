/**
 * POST /api/v1/artists/[slug]/banner
 * Génère une URL presignée pour l'upload du banner.
 */

import { createPresignedUploadUrl, generateKey, ALLOWED_IMAGE_TYPES } from "@/lib/storage";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { created, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/response";
import { z } from "zod";

const presignSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.enum(ALLOWED_IMAGE_TYPES as unknown as [string, ...string[]]),
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

  const parsed = presignSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    const key = generateKey("banners", parsed.data.contentType, true);
    const result = await createPresignedUploadUrl(key, parsed.data.contentType);
    return created(result);
  } catch (err) {
    console.error("[POST /api/v1/artists/[slug]/banner]", err);
    return serverError();
  }
}
