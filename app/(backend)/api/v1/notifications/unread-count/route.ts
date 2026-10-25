import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/response";

// GET /api/v1/notifications/unread-count
export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    // Compte jusqu'à 100 max — au-delà on affiche "99+"
    const count = await prisma.notification.count({
      where: { userId: session.sub, read: false },
      // Prisma ne supporte pas LIMIT sur count, on prend tous puis on plafonne
    });
    return ok({ count: Math.min(count, 99), hasMore: count > 99 });
  } catch (err) {
    console.error("[GET /api/v1/notifications/unread-count]", err);
    return serverError();
  }
}
