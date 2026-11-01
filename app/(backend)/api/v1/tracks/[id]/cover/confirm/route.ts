import { cdnUrl, deleteStoredUrl, isStorageConfigured, objectExists } from "@/lib/storage";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/response";
import { z } from "zod";
import { storageKey } from "@/lib/validations/upload";

const confirmSchema = z.object({
  key: storageKey("covers"),
});

// POST /api/v1/tracks/[id]/cover/confirm
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  if (!isStorageConfigured()) return badRequest("Storage non configuré.");

  const artistProfile = await prisma.artistProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });

  const track = await prisma.track.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true, artistId: true, coverUrl: true },
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

  try {
    if (!(await objectExists(parsed.data.key))) return badRequest("Fichier introuvable : relancez l'envoi.");
    const coverUrl = cdnUrl(parsed.data.key);
    await prisma.track.update({
      where: { id: track.id },
      data: { coverUrl },
    });
    if (track.coverUrl !== coverUrl) await deleteStoredUrl(track.coverUrl);
    return ok({ coverUrl });
  } catch (err) {
    console.error("[POST /api/v1/tracks/[id]/cover/confirm]", err);
    return serverError();
  }
}
