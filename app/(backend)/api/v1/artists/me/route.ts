import { getArtistByUserId, updateArtistProfile } from "@/services/users";
import { updateArtistProfileSchema } from "@/lib/validations/user";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/v1/artists/me — Récupère le profil artiste complet de l'utilisateur connecté
export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const artist = await getArtistByUserId(session.sub);
    if (!artist) return notFound("Profil artiste introuvable pour ce compte");
    return ok(artist);
  } catch (err) {
    console.error("[GET /api/v1/artists/me]", err);
    return serverError();
  }
}

// PATCH /api/v1/artists/me — Met à jour le profil artiste de l'utilisateur connecté
export async function PATCH(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  const ownProfile = await prisma.artistProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });

  if (!ownProfile) return notFound("Profil artiste introuvable pour ce compte");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Corps JSON invalide");
  }

  const parsed = updateArtistProfileSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Erreur de validation", parsed.error.flatten().fieldErrors);
  }

  try {
    const updated = await updateArtistProfile(ownProfile.id, parsed.data);
    return ok(updated);
  } catch (err) {
    console.error("[PATCH /api/v1/artists/me]", err);
    return serverError();
  }
}
