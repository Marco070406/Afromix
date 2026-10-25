import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, notFound, serverError } from "@/lib/response";

// GET /api/v1/artists/me/inquiries — Liste des demandes de booking reçues par le DJ
export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const artist = await prisma.artistProfile.findUnique({
      where: { userId: session.sub },
      select: { id: true },
    });

    if (!artist) return notFound("Profil artiste introuvable");

    const inquiries = await prisma.bookingInquiry.findMany({
      where: { artistId: artist.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return ok(inquiries);
  } catch (err) {
    console.error("[GET /api/v1/artists/me/inquiries]", err);
    return serverError();
  }
}
