import { getAlbumBySlug, updateAlbum, deleteAlbum } from "@/services/albums";
import { updateAlbumSchema } from "@/lib/validations/album";
import { ok, badRequest, unauthorized, forbidden, notFound, noContent, serverError } from "@/lib/response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/v1/albums/[id]  — [id] is the slug
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: slug } = await params;
  try {
    const album = await getAlbumBySlug(slug);
    if (!album) return notFound("Album not found");
    return ok(album);
  } catch (err) {
    console.error("[GET /api/v1/albums/[id]]", err);
    return serverError();
  }
}

// PATCH /api/v1/albums/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const artistProfile = await prisma.artistProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });
  if (!artistProfile && session.role !== "ADMIN") return forbidden("Artist profile not found");

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = updateAlbumSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    const album = await updateAlbum(
      id,
      artistProfile?.id ?? "",
      parsed.data,
      session.role === "ADMIN"
    );
    return ok(album);
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return notFound(e.message);
    console.error("[PATCH /api/v1/albums/[id]]", err);
    return serverError();
  }
}

// DELETE /api/v1/albums/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const artistProfile = await prisma.artistProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });
  if (!artistProfile && session.role !== "ADMIN") return forbidden();

  try {
    await deleteAlbum(id, artistProfile?.id ?? "", session.role === "ADMIN");
    return noContent();
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return notFound(e.message);
    console.error("[DELETE /api/v1/albums/[id]]", err);
    return serverError();
  }
}
