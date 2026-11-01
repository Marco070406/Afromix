import { cdnUrl, deleteObject, isStorageConfigured, objectExists } from "@/lib/storage";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/response";
import { z } from "zod";
import { storageKey } from "@/lib/validations/upload";

const confirmSchema = z.object({
  key: storageKey("tracks"),
  durationSec: z.number().int().positive().optional(),
});

// POST /api/v1/tracks/[id]/audio/confirm
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  if (!isStorageConfigured()) {
    return badRequest("Storage non configuré.");
  }

  const artistProfile = await prisma.artistProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });

  const track = await prisma.track.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true, audioKey: true, artistId: true },
  });

  if (!track) return notFound("Track not found");

  if (session.role !== "ADMIN" && (!artistProfile || track.artistId !== artistProfile.id)) {
    return forbidden("Not authorized");
  }

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  const { key, durationSec } = parsed.data;

  try {
    if (!(await objectExists(key))) return badRequest("Fichier introuvable : relancez l'envoi.");

    if (track.audioKey && track.audioKey !== key) {
      await deleteObject(track.audioKey);
    }

    const audioUrl = cdnUrl(key);

    const updated = await prisma.track.update({
      where: { id: track.id },
      data: {
        audioKey: key,
        audioUrl,
        status: "PROCESSING",
        ...(durationSec != null && { durationSec }),
      },
      select: { id: true, slug: true, audioUrl: true, audioKey: true, status: true, durationSec: true },
    });

    return ok({
      audioUrl: updated.audioUrl,
      audioKey: updated.audioKey,
      status: updated.status,
      durationSec: updated.durationSec,
      message: "Audio uploadé. Le fichier est en cours de traitement.",
    });
  } catch (err) {
    console.error("[POST /api/v1/tracks/[id]/audio/confirm]", err);
    return serverError();
  }
}
