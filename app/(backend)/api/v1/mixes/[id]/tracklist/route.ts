import { addToTracklist, removeFromTracklist } from "@/services/mixes";
import { addTracklistItemSchema } from "@/lib/validations/mix";
import { ok, created, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/v1/mixes/[id]/tracklist — lister la tracklist du mix
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const mix = await prisma.mix.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: {
      id: true,
      tracklist: {
        orderBy: { position: "asc" },
        include: {
          track: {
            select: {
              id: true,
              title: true,
              durationSec: true,
              artist: { select: { id: true, stageName: true, avatarUrl: true } },
            },
          },
        },
      },
    },
  });
  if (!mix) return notFound("Mix not found");

  const formatted = mix.tracklist.map((item) => ({
    id: item.id,
    trackId: item.trackId,
    title: item.track.title,
    artistName: item.track.artist?.stageName ?? "",
    position: item.position,
    startSec: item.startSec,
  }));

  return ok(formatted);
}

// POST /api/v1/mixes/[id]/tracklist — ajouter un track à la tracklist
export async function POST(
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
  if (!artistProfile) return forbidden("Artist profile not found");

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = addTracklistItemSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  // Résout le mixId depuis slug ou id
  const mix = await prisma.mix.findFirst({
    where: { OR: [{ id }, { slug: id }], artistId: artistProfile.id },
    select: { id: true, genre: true },
  });
  if (!mix) return notFound("Mix not found or not owned by artist");

  let trackId = parsed.data.trackId;

  // Si aucun trackId fourni, création automatique d'un track avec le titre donné
  if (!trackId && parsed.data.title) {
    const rawTitle = parsed.data.title.trim();
    const artistName = parsed.data.artistName?.trim();
    const fullTitle = artistName ? `${artistName} - ${rawTitle}` : rawTitle;
    const slug = `${rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}-${Math.random().toString(36).slice(2, 7)}`;

    const newTrack = await prisma.track.create({
      data: {
        artistId: artistProfile.id,
        title: fullTitle,
        slug,
        status: "PUBLISHED",
        genre: mix.genre,
      },
      select: { id: true },
    });
    trackId = newTrack.id;
  }

  if (!trackId) {
    return badRequest("Un trackId ou un titre est requis");
  }

  try {
    await addToTracklist(
      mix.id,
      artistProfile.id,
      trackId,
      parsed.data.position,
      parsed.data.startSec
    );
    return created({ message: "Track added to tracklist", trackId });
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return notFound(e.message);
    console.error("[POST /api/v1/mixes/[id]/tracklist]", err);
    return serverError();
  }
}

// DELETE /api/v1/mixes/[id]/tracklist?itemId=xxx — retirer un track
export async function DELETE(
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
  if (!artistProfile) return forbidden("Artist profile not found");

  const url = new URL(request.url);
  const itemId = url.searchParams.get("itemId");
  if (!itemId) return badRequest("itemId query param is required");

  const mix = await prisma.mix.findFirst({
    where: { OR: [{ id }, { slug: id }], artistId: artistProfile.id },
    select: { id: true },
  });
  if (!mix) return notFound("Mix not found or not owned by artist");

  try {
    await removeFromTracklist(mix.id, artistProfile.id, itemId);
    return ok({ message: "Track removed from tracklist" });
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return notFound(e.message);
    console.error("[DELETE /api/v1/mixes/[id]/tracklist]", err);
    return serverError();
  }
}
