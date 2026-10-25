import { listMixes, createMix } from "@/services/mixes";
import { mixQuerySchema, createMixSchema } from "@/lib/validations/mix";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@/lib/response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

// GET /api/v1/mixes
export async function GET(request: NextRequest): Promise<Response> {
  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = mixQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest("Invalid query params", parsed.error.flatten().fieldErrors);
  }

  try {
    const result = await listMixes(parsed.data);
    return ok(result.items, { meta: result.meta });
  } catch (err) {
    console.error("[GET /api/v1/mixes]", err);
    return serverError();
  }
}

// POST /api/v1/mixes
export async function POST(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.role !== "ARTIST") {
    return forbidden("Only artists can create mixes");
  }

  // Resolve artistProfile from userId
  const artistProfile = await prisma.artistProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });
  if (!artistProfile) return forbidden("Artist profile not found");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = createMixSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    const mix = await createMix(artistProfile.id, parsed.data);
    return created(mix);
  } catch (err) {
    console.error("[POST /api/v1/mixes]", err);
    return serverError();
  }
}
