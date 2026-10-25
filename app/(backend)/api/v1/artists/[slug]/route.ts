import { getArtistBySlug, updateArtistProfile } from "@/services/users";
import { updateArtistProfileSchema } from "@/lib/validations/user";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/v1/artists/[slug]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await params;
  try {
    const artist = await getArtistBySlug(slug);
    if (!artist) return notFound("Artist not found");

    // Check if the current user follows this artist (optional auth)
    let isFollowing = false;
    const session = await getSession();
    if (session?.sub && artist.userId) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.sub,
            followingId: artist.userId,
          },
        },
        select: { id: true },
      });
      isFollowing = !!follow;
    }

    return ok({ ...artist, isFollowing });
  } catch (err) {
    console.error("[GET /api/v1/artists/[slug]]", err);
    return serverError();
  }
}


// PATCH /api/v1/artists/[slug]
// L'artiste connecté met à jour son propre profil.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  // Résoud le profil artiste du user connecté
  const ownProfile = await prisma.artistProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true, slug: true },
  });

  if (!ownProfile && session.role !== "ADMIN") return forbidden("No artist profile found for this account");

  // Un artiste ne peut modifier que son propre profil (sauf admin)
  if (ownProfile?.slug !== slug && session.role !== "ADMIN") {
    return forbidden("Cannot modify another artist's profile");
  }

  // Les admins peuvent modifier n'importe quel profil
  const targetProfile = session.role === "ADMIN" && ownProfile?.slug !== slug
    ? await prisma.artistProfile.findUnique({ where: { slug }, select: { id: true } })
    : ownProfile;

  if (!targetProfile) return notFound("Artist not found");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = updateArtistProfileSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    const artist = await updateArtistProfile(targetProfile.id, parsed.data);
    return ok(artist);
  } catch (err) {
    console.error("[PATCH /api/v1/artists/[slug]]", err);
    return serverError();
  }
}
