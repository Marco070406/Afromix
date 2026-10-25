import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { noContent, unauthorized, forbidden, notFound, serverError } from "@/lib/response";
import { cacheDel } from "@/lib/redis";

// DELETE /api/v1/likes/[id] — supprime un like par son id
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const like = await prisma.like.findUnique({
      where: { id },
      select: { id: true, userId: true, targetType: true, mixId: true, trackId: true },
    });

    if (!like) return notFound("Like not found");

    // Seul l'auteur peut supprimer son like (les admins aussi)
    if (like.userId !== session.sub && session.role !== "ADMIN") {
      return forbidden();
    }

    await prisma.$transaction([
      prisma.like.delete({ where: { id } }),
      ...(like.targetType === "MIX" && like.mixId
        ? [prisma.mix.update({ where: { id: like.mixId }, data: { likeCount: { decrement: 1 } } })]
        : []),
      ...(like.targetType === "TRACK" && like.trackId
        ? [prisma.track.update({ where: { id: like.trackId }, data: { likeCount: { decrement: 1 } } })]
        : []),
    ]);

    // Invalide le cache du contenu liké
    if (like.targetType === "MIX" && like.mixId) {
      const mix = await prisma.mix.findUnique({ where: { id: like.mixId }, select: { slug: true } });
      if (mix) await cacheDel(`mixes:detail:${mix.slug}`);
    }

    return noContent();
  } catch (err) {
    console.error("[DELETE /api/v1/likes/[id]]", err);
    return serverError();
  }
}
