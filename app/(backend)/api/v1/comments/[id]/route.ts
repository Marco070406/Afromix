import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, badRequest, unauthorized, forbidden, notFound, noContent, serverError } from "@/lib/response";
import { z } from "zod";

const updateSchema = z.object({
  content: z.string().min(1).max(1000),
});

// PATCH /api/v1/comments/[id] — modifier son propre commentaire
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!comment) return notFound("Comment not found");
  if (comment.userId !== session.sub && session.role !== "ADMIN") {
    return forbidden("Cannot edit another user's comment");
  }

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    const updated = await prisma.comment.update({
      where: { id },
      data: { content: parsed.data.content },
      select: { id: true, content: true, updatedAt: true },
    });
    return ok(updated);
  } catch (err) {
    console.error("[PATCH /api/v1/comments/[id]]", err);
    return serverError();
  }
}

// DELETE /api/v1/comments/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { id: true, userId: true, mixId: true, trackId: true, parentId: true },
  });

  if (!comment) return notFound("Comment not found");
  if (comment.userId !== session.sub && session.role !== "ADMIN") {
    return forbidden("Cannot delete another user's comment");
  }

  try {
    await prisma.comment.delete({ where: { id } });

    // Décrémente commentCount sur le contenu parent (seulement les commentaires top-level)
    if (!comment.parentId) {
      if (comment.mixId) {
        await prisma.mix.update({
          where: { id: comment.mixId },
          data: { commentCount: { decrement: 1 } },
        });
      } else if (comment.trackId) {
        await prisma.track.update({
          where: { id: comment.trackId },
          data: { commentCount: { decrement: 1 } },
        });
      }
    }

    return noContent();
  } catch (err) {
    console.error("[DELETE /api/v1/comments/[id]]", err);
    return serverError();
  }
}
