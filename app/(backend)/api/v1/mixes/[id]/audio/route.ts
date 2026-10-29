/**
 * Routes audio pour un mix.
 *
 * Flux :
 *  1. POST /api/v1/mixes/[id]/audio       { contentType } → { uploadUrl, key, cdnUrl, expiresIn, maxBytes }
 *  2. Client PUT <uploadUrl>              fichier audio brut
 *  3. POST /api/v1/mixes/[id]/audio/confirm { key, durationSec? } → { audioUrl, status: "PROCESSING" }
 */

import { limitOrNull } from "@/lib/redis";
import {
  createPresignedUploadUrl,
  generateKey,
  isAudioType,
  isStorageConfigured,
  storageUnavailable,
} from "@/lib/storage";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/response";
import { z } from "zod";

const presignSchema = z.object({
  contentType: z.string().refine(isAudioType, {
    message:
      "Type de fichier non supporté. Formats acceptés : MP3, WAV, AIFF, FLAC, OGG",
  }),
});

// ─── Types ────────────────────────────────────────────────────────────────────

type MixResolution =
  | { error: Response; mix?: never }
  | { mix: { id: string; slug: string; artistId: string; audioKey: string | null }; error?: never };

async function resolveMixOwnership(
  idOrSlug: string,
  userId: string,
  role: string
): Promise<MixResolution> {
  const artistProfile = await prisma.artistProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  const mix = await prisma.mix.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true, slug: true, artistId: true, audioKey: true },
  });

  if (!mix) return { error: notFound("Mix not found") };

  if (role !== "ADMIN" && (!artistProfile || mix.artistId !== artistProfile.id)) {
    return { error: forbidden("Not authorized to modify this mix") };
  }

  return { mix };
}

// ─── POST — Presign ───────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const unavailable = storageUnavailable() ?? (await limitOrNull("upload", session.sub, 60, 600));
  if (unavailable) return unavailable;

  // Valide le body avant toute requête DB
  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = presignSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  // Vérifie ownership
  const resolved = await resolveMixOwnership(id, session.sub, session.role);
  if (resolved.error) return resolved.error;

  // Vérifie la config storage
  if (!isStorageConfigured()) {
    return badRequest(
      "Storage non configuré. Ajoute STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY et STORAGE_BUCKET dans .env.local"
    );
  }

  try {
    const key = generateKey("mixes", parsed.data.contentType, true);
    const result = await createPresignedUploadUrl(key, parsed.data.contentType);
    return created(result);
  } catch (err) {
    console.error("[POST /api/v1/mixes/[id]/audio]", err);
    return serverError(
      "Impossible de générer l'URL d'upload. Vérifie les credentials R2/S3."
    );
  }
}
