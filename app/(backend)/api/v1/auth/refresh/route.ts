import { verifyToken, setAuthCookies, clearAuthCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, unauthorized } from "@/lib/response";
import { cookies } from "next/headers";

const COOKIE_NAME_REFRESH = "afromix_refresh";

/**
 * POST /api/v1/auth/refresh
 * Uses the refresh token cookie to issue a new access token.
 * Also rotates the refresh token for security.
 */
export async function POST(): Promise<Response> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(COOKIE_NAME_REFRESH)?.value;

  if (!refreshToken) return unauthorized();

  const payload = await verifyToken(refreshToken, "refresh");
  if (!payload?.sub) return unauthorized();

  // Le compte doit toujours exister et ne pas être suspendu (deletedAt)
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    await clearAuthCookies();
    return unauthorized();
  }

  // Issue new tokens (both access and refresh are rotated)
  await setAuthCookies(user.id, user.role);

  return ok({ refreshed: true });
}
