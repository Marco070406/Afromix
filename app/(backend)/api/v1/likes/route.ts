import { limitOrNull } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, created, badRequest, unauthorized, notFound, serverError } from "@/lib/response";
import { notifyNewLike } from "@/services/notifications";
import { z } from "zod";

const likeSchema = z.object({
  targetType: z.enum(["MIX", "TRACK"]),
  targetId: z.string().min(1),
});

// POST /api/v1/likes — toggle like
export async function POST(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  const limited = await limitOrNull("like", session.sub, 60, 60);
  if (limited) return limited;

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = likeSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  const { targetType, targetId } = parsed.data;

  try {
    // Vérifie la cible et récupère les infos pour la notification
    let contentOwnerUserId: string | null = null;
    let contentTitle = "";
    let contentUrl = "";

    if (targetType === "MIX") {
      const mix = await prisma.mix.findUnique({
        where: { id: targetId },
        select: { id: true, title: true, slug: true, artist: { select: { userId: true } } },
      });
      if (!mix) return notFound("Mix not found");
      contentOwnerUserId = mix.artist.userId;
      contentTitle = mix.title;
      contentUrl = `/mixes/${mix.slug}`;
    } else {
      const track = await prisma.track.findUnique({
        where: { id: targetId },
        select: { id: true, title: true, slug: true, artist: { select: { userId: true } } },
      });
      if (!track) return notFound("Track not found");
      contentOwnerUserId = track.artist.userId;
      contentTitle = track.title;
      contentUrl = `/tracks/${track.slug}`;
    }

    const existingLike = await prisma.like.findFirst({
      where: {
        userId: session.sub,
        targetType,
        ...(targetType === "MIX" ? { mixId: targetId } : { trackId: targetId }),
      },
    });

    if (existingLike) {
      await prisma.$transaction([
        prisma.like.delete({ where: { id: existingLike.id } }),
        targetType === "MIX"
          ? prisma.mix.update({ where: { id: targetId }, data: { likeCount: { decrement: 1 } } })
          : prisma.track.update({ where: { id: targetId }, data: { likeCount: { decrement: 1 } } }),
      ]);
      return ok({ liked: false });
    } else {
      await prisma.$transaction([
        prisma.like.create({
          data: {
            userId: session.sub,
            targetType,
            ...(targetType === "MIX" ? { mixId: targetId } : { trackId: targetId }),
          },
        }),
        targetType === "MIX"
          ? prisma.mix.update({ where: { id: targetId }, data: { likeCount: { increment: 1 } } })
          : prisma.track.update({ where: { id: targetId }, data: { likeCount: { increment: 1 } } }),
      ]);

      // Notification (non-bloquant, ne pas notifier ses propres contenus)
      if (contentOwnerUserId && contentOwnerUserId !== session.sub) {
        const liker = await prisma.user.findUnique({
          where: { id: session.sub },
          select: { profile: { select: { displayName: true, avatarUrl: true } } },
        });
        const displayName = liker?.profile?.displayName ?? "Quelqu'un";
        const avatarUrl = liker?.profile?.avatarUrl ?? null;
        notifyNewLike(contentOwnerUserId, displayName, avatarUrl, contentTitle, contentUrl).catch(() => {});
      }

      return created({ liked: true });
    }
  } catch (err) {
    console.error("[POST /api/v1/likes]", err);
    return serverError();
  }
}
