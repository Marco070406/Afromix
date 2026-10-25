import { recordPlay } from "@/services/mixes";
import { getSession } from "@/lib/auth";
import { ok, notFound, serverError } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// POST /api/v1/mixes/[id]/play
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  const headersList = await headers();
  const country = headersList.get("cf-ipcountry") ?? undefined;

  // id peut être un slug ou un cuid
  const mix = await prisma.mix.findFirst({
    where: { OR: [{ id }, { slug: id }], status: "PUBLISHED" },
    select: { id: true },
  });
  if (!mix) return notFound("Mix not found");

  try {
    await recordPlay(mix.id, session?.sub, country);
    return ok({ played: true });
  } catch (err) {
    console.error("[POST /api/v1/mixes/[id]/play]", err);
    return serverError();
  }
}
