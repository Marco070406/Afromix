import { recordPlay } from "@/services/mixes";
import { getSession } from "@/lib/auth";
import { ok, notFound, serverError } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { clientIp, limitOrNull, rateLimit } from "@/lib/redis";

// POST /api/v1/mixes/[id]/play
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  const headersList = await headers();
  // Vercel fournit le pays dans x-vercel-ip-country (cf-ipcountry derrière Cloudflare)
  const country = headersList.get("x-vercel-ip-country") ?? headersList.get("cf-ipcountry") ?? undefined;
  const ip = clientIp(headersList);

  // Plafond global par IP : bloque les scripts qui enchaînent les écoutes
  const limited = await limitOrNull("play-ip", ip, 300, 60 * 60);
  if (limited) return limited;

  // id peut être un slug ou un cuid
  const mix = await prisma.mix.findFirst({
    where: { OR: [{ id }, { slug: id }], status: "PUBLISHED" },
    select: { id: true },
  });
  if (!mix) return notFound("Mix not found");

  // Une écoute comptée par auditeur (compte, sinon IP) et par titre toutes les 30 min :
  // relancer la lecture ne gonfle pas les compteurs ni les classements
  const firstPlay = await rateLimit(`play:${mix.id}:${session?.sub ?? ip}`, 1, 30 * 60);
  if (!firstPlay.allowed) return ok({ played: false });

  try {
    await recordPlay(mix.id, session?.sub, country);
    return ok({ played: true });
  } catch (err) {
    console.error("[POST /api/v1/mixes/[id]/play]", err);
    return serverError();
  }
}
