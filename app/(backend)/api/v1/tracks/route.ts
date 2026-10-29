import { limitOrNull } from "@/lib/redis";
import { listTracks, createTrack } from "@/services/tracks";
import { trackQuerySchema, createTrackSchema } from "@/lib/validations/track";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@/lib/response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

// GET /api/v1/tracks
export async function GET(request: NextRequest): Promise<Response> {
  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = trackQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest("Invalid query params", parsed.error.flatten().fieldErrors);
  }
  try {
    const result = await listTracks(parsed.data);
    return ok(result.items, { meta: result.meta });
  } catch (err) {
    console.error("[GET /api/v1/tracks]", err);
    return serverError();
  }
}

// POST /api/v1/tracks
export async function POST(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  const limited = await limitOrNull("content-create", session.sub, 30, 3600);
  if (limited) return limited;
  if (session.role !== "ARTIST") {
    return forbidden("Only artists can upload tracks");
  }

  const artistProfile = await prisma.artistProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });
  if (!artistProfile) return forbidden("Artist profile not found");

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = createTrackSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    const track = await createTrack(artistProfile.id, parsed.data);
    return created(track);
  } catch (err) {
    console.error("[POST /api/v1/tracks]", err);
    return serverError();
  }
}
