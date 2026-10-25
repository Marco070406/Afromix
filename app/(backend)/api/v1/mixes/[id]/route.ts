import { getMixBySlug, updateMix, deleteMix } from "@/services/mixes";
import { updateMixSchema } from "@/lib/validations/mix";
import { ok, badRequest, unauthorized, forbidden, notFound, noContent, serverError } from "@/lib/response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/v1/mixes/[id]  — [id] is the mix slug
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: slug } = await params;

  try {
    const session = await getSession();
    const mix = await getMixBySlug(slug, session?.sub);
    if (!mix) return notFound("Mix not found");
    return ok(mix);
  } catch (err) {
    console.error("[GET /api/v1/mixes/[id]]", err);
    return serverError();
  }
}

// PATCH /api/v1/mixes/[id]
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
  if (!artistProfile) return forbidden("Artist profile not found");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = updateMixSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    const mix = await updateMix(id, artistProfile.id, parsed.data);
    return ok(mix);
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return notFound(e.message);
    console.error("[PATCH /api/v1/mixes/[id]]", err);
    return serverError();
  }
}

// DELETE /api/v1/mixes/[id]
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

  // Admins can delete any mix
  const isAdmin = session.role === "ADMIN";
  if (!isAdmin && !artistProfile) return forbidden();

  try {
    await deleteMix(id, artistProfile?.id ?? "", session.role === "ADMIN");
    return noContent();
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return notFound(e.message);
    console.error("[DELETE /api/v1/mixes/[id]]", err);
    return serverError();
  }
}
