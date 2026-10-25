import { cdnUrl, isStorageConfigured } from "@/lib/storage";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/response";
import { z } from "zod";

const confirmSchema = z.object({
  key: z.string().min(1).regex(/^covers\//, "La clé doit être dans le dossier covers/"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  if (!isStorageConfigured()) return badRequest("Storage non configuré.");

  const artistProfile = await prisma.artistProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });

  const mix = await prisma.mix.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true, artistId: true, coverUrl: true },
  });

  if (!mix) return notFound("Mix not found");
  if (session.role !== "ADMIN" && (!artistProfile || mix.artistId !== artistProfile.id)) {
    return forbidden("Not authorized");
  }

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    const coverUrl = cdnUrl(parsed.data.key);
    await prisma.mix.update({
      where: { id: mix.id },
      data: { coverUrl },
    });
    return ok({ coverUrl });
  } catch (err) {
    console.error("[POST /api/v1/mixes/[id]/cover/confirm]", err);
    return serverError();
  }
}
