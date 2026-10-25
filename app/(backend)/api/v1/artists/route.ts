import { listArtists } from "@/services/users";
import { artistQuerySchema } from "@/lib/validations/user";
import { ok, badRequest, serverError } from "@/lib/response";
import type { NextRequest } from "next/server";

// GET /api/v1/artists
// Filtres disponibles : ?q=&country=FR&genre=AFROBEATS&verified=true&page=1&pageSize=20
export async function GET(request: NextRequest): Promise<Response> {
  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = artistQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest("Invalid query params", parsed.error.flatten().fieldErrors);
  }

  try {
    const result = await listArtists(parsed.data);
    return ok(result.items, { meta: result.meta });
  } catch (err) {
    console.error("[GET /api/v1/artists]", err);
    return serverError();
  }
}
