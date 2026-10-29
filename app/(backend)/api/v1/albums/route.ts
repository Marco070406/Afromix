import { limitOrNull } from "@/lib/redis";
import { listAlbums, createAlbum } from "@/services/albums";
import { albumQuerySchema, createAlbumSchema } from "@/lib/validations/album";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@/lib/response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

// GET /api/v1/albums
export async function GET(request: NextRequest): Promise<Response> {
  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = albumQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest("Invalid query params", parsed.error.flatten().fieldErrors);
  }
  try {
    const result = await listAlbums(parsed.data);
    return ok(result.items, { meta: result.meta });
  } catch (err) {
    console.error("[GET /api/v1/albums]", err);
    return serverError();
  }
}

// POST /api/v1/albums
export async function POST(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  const limited = await limitOrNull("content-create", session.sub, 30, 3600);
  if (limited) return limited;
  if (session.role !== "ARTIST") {
    return forbidden("Only artists can create albums");
  }

  const artistProfile = await prisma.artistProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });
  if (!artistProfile) return forbidden("Artist profile not found");

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = createAlbumSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    const album = await createAlbum(artistProfile.id, parsed.data);
    return created(album);
  } catch (err) {
    console.error("[POST /api/v1/albums]", err);
    return serverError();
  }
}
