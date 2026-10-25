import { requestVerification } from "@/services/users";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, unauthorized, forbidden, notFound, conflict, serverError } from "@/lib/response";

// POST /api/v1/artists/[slug]/verify
// L'artiste demande la vérification de son profil.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const profile = await prisma.artistProfile.findUnique({
    where: { slug },
    select: { id: true, userId: true },
  });
  if (!profile) return notFound("Artist not found");

  // Seul l'artiste lui-même peut demander la vérification
  if (profile.userId !== session.sub && session.role !== "ADMIN") {
    return forbidden();
  }

  try {
    await requestVerification(profile.id);
    return ok({ message: "Verification request submitted" });
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 409) return conflict(e.message);
    if (e.status === 404) return notFound(e.message);
    console.error("[POST /api/v1/artists/[slug]/verify]", err);
    return serverError();
  }
}
