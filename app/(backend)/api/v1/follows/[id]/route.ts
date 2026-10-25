import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { noContent, unauthorized, forbidden, notFound, serverError } from "@/lib/response";

// DELETE /api/v1/follows/[id] — supprime un follow par son id
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const follow = await prisma.follow.findUnique({
      where: { id },
      select: { id: true, followerId: true, followingId: true },
    });

    if (!follow) return notFound("Follow not found");

    if (follow.followerId !== session.sub && session.role !== "ADMIN") {
      return forbidden();
    }

    await prisma.$transaction([
      prisma.follow.delete({ where: { id } }),
      prisma.artistProfile.updateMany({
        where: { userId: follow.followingId },
        data: { followerCount: { decrement: 1 } },
      }),
    ]);

    return noContent();
  } catch (err) {
    console.error("[DELETE /api/v1/follows/[id]]", err);
    return serverError();
  }
}
