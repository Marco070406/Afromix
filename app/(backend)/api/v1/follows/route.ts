import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, created, badRequest, unauthorized, notFound, serverError } from "@/lib/response";
import { notifyNewFollower } from "@/services/notifications";
import { z } from "zod";
import { cacheDel } from "@/lib/redis";

const followSchema = z.object({
  artistUserId: z.string().min(1).optional(),
  artistId: z.string().min(1).optional(),
}).refine((data) => data.artistUserId || data.artistId, {
  message: "artistUserId or artistId is required",
});

// POST /api/v1/follows — toggle follow
export async function POST(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = followSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  let targetUserId = parsed.data.artistUserId;

  try {
    if (targetUserId) {
      const userExists = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
      if (!userExists) {
        // Maybe it's an artistProfile id
        const artist = await prisma.artistProfile.findUnique({
          where: { id: targetUserId },
          select: { userId: true },
        });
        if (artist) targetUserId = artist.userId;
      }
    } else if (parsed.data.artistId) {
      const artist = await prisma.artistProfile.findUnique({
        where: { id: parsed.data.artistId },
        select: { userId: true },
      });
      if (artist) targetUserId = artist.userId;
    }

    if (!targetUserId) return notFound("User not found");
    if (targetUserId === session.sub) return badRequest("Cannot follow yourself");

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: session.sub, followingId: targetUserId } },
    });

    const targetArtist = await prisma.artistProfile.findUnique({
      where: { userId: targetUserId },
      select: { slug: true },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.follow.delete({ where: { id: existing.id } }),
        prisma.artistProfile.updateMany({
          where: { userId: targetUserId },
          data: { followerCount: { decrement: 1 } },
        }),
      ]);
      if (targetArtist?.slug) {
        await cacheDel(`artists:detail:${targetArtist.slug}`);
      }
      await cacheDel("artists:list:*");
      return ok({ following: false });
    } else {
      await prisma.$transaction([
        prisma.follow.create({
          data: { followerId: session.sub, followingId: targetUserId },
        }),
        prisma.artistProfile.updateMany({
          where: { userId: targetUserId },
          data: { followerCount: { increment: 1 } },
        }),
      ]);
      if (targetArtist?.slug) {
        await cacheDel(`artists:detail:${targetArtist.slug}`);
      }
      await cacheDel("artists:list:*");

      // Notification (non-bloquant)
      const follower = await prisma.user.findUnique({
        where: { id: session.sub },
        select: {
          profile: { select: { displayName: true, avatarUrl: true } },
          artistProfile: { select: { slug: true } },
        },
      });
      const displayName = follower?.profile?.displayName ?? "Quelqu'un";
      const avatarUrl = follower?.profile?.avatarUrl ?? null;
      const profileUrl = follower?.artistProfile?.slug
        ? `/artists/${follower.artistProfile.slug}`
        : `/users/${session.sub}`;

      notifyNewFollower(targetUserId, displayName, avatarUrl, profileUrl).catch(() => {});

      return created({ following: true });
    }
  } catch (err) {
    console.error("[POST /api/v1/follows]", err);
    return serverError();
  }
}
