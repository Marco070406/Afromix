import {
  getPlaylistWithItems,
  updatePlaylist,
  deletePlaylist,
  serializePlaylist,
  serializeItem,
} from "@/services/playlists";
import { updatePlaylistSchema } from "@/lib/validations/playlist";
import { ok, badRequest, unauthorized, notFound, noContent, serverError } from "@/lib/response";
import { getSession } from "@/lib/auth";

// GET /api/v1/playlists/[id] — détail avec tous les items
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();

  try {
    const playlist = await getPlaylistWithItems(id, session?.sub);
    if (!playlist) return notFound("Playlist not found");

    return ok({
      ...serializePlaylist(playlist, playlist.userId),
      items: playlist.items.map(serializeItem),
    });
  } catch (err) {
    console.error("[GET /api/v1/playlists/[id]]", err);
    return serverError();
  }
}

// PATCH /api/v1/playlists/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = updatePlaylistSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    const playlist = await updatePlaylist(id, session.sub, parsed.data);
    return ok(serializePlaylist(playlist, session.sub));
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return notFound(e.message);
    console.error("[PATCH /api/v1/playlists/[id]]", err);
    return serverError();
  }
}

// DELETE /api/v1/playlists/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    await deletePlaylist(id, session.sub);
    return noContent();
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return notFound(e.message);
    console.error("[DELETE /api/v1/playlists/[id]]", err);
    return serverError();
  }
}
