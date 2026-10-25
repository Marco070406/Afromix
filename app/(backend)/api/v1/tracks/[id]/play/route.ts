import { recordTrackPlay } from "@/services/tracks";
import { getSession } from "@/lib/auth";
import { ok, notFound, serverError } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// POST /api/v1/tracks/[id]/play
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  const headersList = await headers();
  const country = headersList.get("cf-ipcountry") ?? undefined;

  // id peut être un slug ou un cuid — on supporte les deux
  const track = await prisma.track.findFirst({
    where: { OR: [{ id }, { slug: id }], status: "PUBLISHED" },
    select: { id: true },
  });
  if (!track) return notFound("Track not found");

  try {
    await recordTrackPlay(track.id, session?.sub, country);
    return ok({ played: true });
  } catch (err) {
    console.error("[POST /api/v1/tracks/[id]/play]", err);
    return serverError();
  }
}
