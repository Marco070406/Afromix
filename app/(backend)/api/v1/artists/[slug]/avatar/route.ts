/**
 * Routes pour l'avatar d'un artiste.
 *
 * Flow client :
 *  1. POST /api/v1/artists/[slug]/avatar/presign
 *     → reçoit { uploadUrl, key, cdnUrl }
 *  2. Client upload le fichier directement sur R2/S3 via uploadUrl (PUT)
 *  3. POST /api/v1/artists/[slug]/avatar/confirm
 *     → body { key } → persiste cdnUrl comme avatarUrl sur le profil
 */

import { createPresignedUploadUrl, generateKey, ALLOWED_IMAGE_TYPES, storageUnavailable } from "@/lib/storage";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { created, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/response";
import { z } from "zod";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ProfileResolution =
  | { error: Response; profile?: never }
  | { profile: { id: string; slug: string }; error?: never };

async function resolveOwnProfile(
  slug: string,
  userId: string,
  role: string
): Promise<ProfileResolution> {
  const own = await prisma.artistProfile.findUnique({
    where: { userId },
    select: { id: true, slug: true },
  });
  // Un admin peut agir sur n'importe quel profil, même sans profil artiste à lui
  if (!own && role !== "ADMIN") return { error: forbidden("No artist profile found for this account") };

  if (own?.slug !== slug && role !== "ADMIN") {
    return { error: forbidden("Cannot modify another artist's profile") };
  }

  if (own && own.slug === slug) return { profile: own };

  const target = await prisma.artistProfile.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });
  if (!target) return { error: notFound("Artist not found") };
  return { profile: target };
}

// ─── POST /presign ────────────────────────────────────────────────────────────

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

  const unavailable = storageUnavailable();
  if (unavailable) return unavailable;

  const resolved = await resolveOwnProfile(slug, session.sub, session.role);
  if (resolved.error) return resolved.error;

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = presignSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    const key = generateKey("avatars", parsed.data.contentType, true);
    const result = await createPresignedUploadUrl(key, parsed.data.contentType);
    return created(result);
  } catch (err) {
    console.error("[POST /api/v1/artists/[slug]/avatar]", err);
    return serverError();
  }
}
