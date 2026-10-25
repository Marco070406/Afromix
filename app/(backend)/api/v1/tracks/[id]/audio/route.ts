/**
 * Routes audio pour un track.
 * Même flux que /mixes/[id]/audio :
 *  1. POST /api/v1/tracks/[id]/audio      → presign
 *  2. Client PUT <uploadUrl>              → upload direct R2
 *  3. POST /api/v1/tracks/[id]/audio/confirm → persiste audioUrl
 */

import { createPresignedUploadUrl, generateKey, isAudioType, isStorageConfigured } from "@/lib/storage";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { created, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/response";
import { z } from "zod";

const presignSchema = z.object({
  contentType: z.string().refine(isAudioType, {
    message: "Type de fichier non supporté. Formats acceptés : MP3, WAV, AIFF, FLAC, OGG",
  }),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  if (!isStorageConfigured()) {
    return badRequest(
      "Storage non configuré. Ajoute STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY et STORAGE_BUCKET dans .env.local"
    );
  }

  const artistProfile = await prisma.artistProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });

  const track = await prisma.track.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true, artistId: true },
  });

  if (!track) return notFound("Track not found");

  if (session.role !== "ADMIN" && (!artistProfile || track.artistId !== artistProfile.id)) {
    return forbidden("Not authorized to modify this track");
  }

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = presignSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    const key = generateKey("tracks", parsed.data.contentType, true);
    const result = await createPresignedUploadUrl(key, parsed.data.contentType);
    return created(result);
  } catch (err) {
    console.error("[POST /api/v1/tracks/[id]/audio]", err);
    return serverError("Impossible de générer l'URL d'upload.");
  }
}
