import { limitOrNull } from "@/lib/redis";
import {
  addPlaylistItem,
  removePlaylistItem,
  serializeItem,
} from "@/services/playlists";
import { addPlaylistItemSchema } from "@/lib/validations/playlist";
import { ok, created, badRequest, unauthorized, notFound, serverError } from "@/lib/response";
import { getSession } from "@/lib/auth";

// POST /api/v1/playlists/[id]/items — ajouter un mix ou track
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const limited = await limitOrNull("playlist-item", session.sub, 120, 600);
  if (limited) return limited;

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = addPlaylistItemSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    const item = await addPlaylistItem(id, session.sub, parsed.data);
    return created(serializeItem(item));
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return notFound(e.message);
    console.error("[POST /api/v1/playlists/[id]/items]", err);
    return serverError();
  }
}

// DELETE /api/v1/playlists/[id]/items?itemId=xxx — retirer un item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const url = new URL(request.url);
  const itemId = url.searchParams.get("itemId");
  if (!itemId) return badRequest("itemId query param is required");

  try {
    await removePlaylistItem(id, itemId, session.sub);
    return ok({ message: "Item removed" });
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return notFound(e.message);
    console.error("[DELETE /api/v1/playlists/[id]/items]", err);
    return serverError();
  }
}
