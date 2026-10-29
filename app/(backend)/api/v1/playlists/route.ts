import { limitOrNull } from "@/lib/redis";
import { createPlaylist, listUserPlaylists, serializePlaylist } from "@/services/playlists";
import { createPlaylistSchema, playlistQuerySchema } from "@/lib/validations/playlist";
import { ok, created, badRequest, unauthorized, serverError } from "@/lib/response";
import { getSession } from "@/lib/auth";
import type { NextRequest } from "next/server";

// GET /api/v1/playlists
// Paramètres : ?userId=<id>&page=1&pageSize=20&isPublic=true
// Sans userId → playlists de l'utilisateur connecté (public + privées)
export async function GET(request: NextRequest): Promise<Response> {
  const session = await getSession();

  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = playlistQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest("Invalid query params", parsed.error.flatten().fieldErrors);
  }

  const { page, pageSize, userId: queryUserId, isPublic } = parsed.data;

  // Si pas de userId en param → liste ses propres playlists (auth requise)
  const targetUserId = queryUserId ?? session?.sub;
  if (!targetUserId) return unauthorized();

  // Un utilisateur qui consulte les playlists d'autrui ne voit que les publiques
  const onlyPublic = isPublic ?? (targetUserId !== session?.sub);

  try {
    const result = await listUserPlaylists(targetUserId, page, pageSize, onlyPublic);
    return ok(
      result.items.map((p) => serializePlaylist(p, p.userId)),
      { meta: result.meta }
    );
  } catch (err) {
    console.error("[GET /api/v1/playlists]", err);
    return serverError();
  }
}

// POST /api/v1/playlists
export async function POST(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  const limited = await limitOrNull("playlist", session.sub, 30, 3600);
  if (limited) return limited;

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = createPlaylistSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    const playlist = await createPlaylist(session.sub, parsed.data);
    return created(serializePlaylist(playlist, session.sub));
  } catch (err) {
    console.error("[POST /api/v1/playlists]", err);
    return serverError();
  }
}
