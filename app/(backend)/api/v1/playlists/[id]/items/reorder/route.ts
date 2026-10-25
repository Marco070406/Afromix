import { reorderPlaylistItems } from "@/services/playlists";
import { reorderItemsSchema } from "@/lib/validations/playlist";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/response";
import { getSession } from "@/lib/auth";

// PATCH /api/v1/playlists/[id]/items/reorder
// Body : { items: [{ id: "...", position: 0 }, ...] }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = reorderItemsSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    await reorderPlaylistItems(id, session.sub, parsed.data);
    return ok({ message: "Playlist reordered" });
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return notFound(e.message);
    console.error("[PATCH /api/v1/playlists/[id]/items/reorder]", err);
    return serverError();
  }
}
