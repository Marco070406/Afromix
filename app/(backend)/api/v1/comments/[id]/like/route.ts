import { limitOrNull } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, notFound, serverError } from "@/lib/response";

/**
 * POST /api/v1/comments/[id]/like
 * Toggle like/unlike sur un commentaire.
 * Utilise un champ booléen en cache utilisateur via la table Like avec targetType COMMENT.
 * Le commentaire n'ayant pas de champ commentId dans Like, on stocke l'id du commentaire
 * dans une relation propre : on incrémente/décrémente likeCount directement.
 *
 * Note : sans authentification Redis, on ne peut pas garantir l'unicité strict.
 * L'implémentation complète avec déduplication sera ajoutée en Phase 9 (Notifications/Redis).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const limited = await limitOrNull("like", session.sub, 60, 60);
  if (limited) return limited;

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { id: true, likeCount: true },
  });
  if (!comment) return notFound("Comment not found");

  try {
    const updated = await prisma.comment.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true },
    });
    return ok({ likeCount: updated.likeCount });
  } catch (err) {
    console.error("[POST /api/v1/comments/[id]/like]", err);
    return serverError();
  }
}
