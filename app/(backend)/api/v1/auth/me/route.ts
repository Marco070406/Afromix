import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, unauthorized, badRequest, serverError } from "@/lib/response";
import { z } from "zod";
import { httpUrl } from "@/lib/validations/common";

const updateProfileSchema = z.object({
  displayName: z.string().min(2, "Le nom doit comporter au moins 2 caractères").max(60).optional(),
  bio: z.string().max(500).optional().nullable(),
  avatarUrl: httpUrl().optional().nullable().or(z.literal("")),
  country: z.string().max(2).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  website: httpUrl().optional().nullable().or(z.literal("")),
});

export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      role: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
          bio: true,
          country: true,
          city: true,
          website: true,
        },
      },
      artistProfile: {
        select: { id: true, slug: true, stageName: true, avatarUrl: true },
      },
    },
  });

  if (!user) return unauthorized();

  return ok({
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: !!user.emailVerified,
    profile: user.profile,
    artistProfile: user.artistProfile,
  });
}

export async function PATCH(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Données invalides");
  }

  const { displayName, bio, avatarUrl, country, city, website } = parsed.data;

  try {
    const profile = await prisma.profile.upsert({
      where: { userId: session.sub },
      create: {
        userId: session.sub,
        displayName: displayName ?? "Utilisateur",
        bio: bio ?? null,
        avatarUrl: avatarUrl || null,
        country: country ?? null,
        city: city ?? null,
        website: website || null,
      },
      update: {
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio: bio || null }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
        ...(country !== undefined && { country: country || null }),
        ...(city !== undefined && { city: city || null }),
        ...(website !== undefined && { website: website || null }),
      },
    });

    return ok({ profile });
  } catch (error) {
    console.error("[PATCH /api/v1/auth/me]", error);
    return serverError("Impossible de mettre à jour le profil");
  }
}

