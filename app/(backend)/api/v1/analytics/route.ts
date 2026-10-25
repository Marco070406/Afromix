import { getArtistAnalytics } from "@/services/analytics";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, serverError } from "@/lib/response";

/**
 * GET /api/v1/analytics
 *
 * Route legacy — retourne une vue condensée (overview + top mixes + plays 30j).
 * Préférer les routes spécialisées pour le dashboard complet :
 *   GET /api/v1/analytics/overview
 *   GET /api/v1/analytics/plays
 *   GET /api/v1/analytics/top-content
 *   GET /api/v1/analytics/audience
 */
export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.role !== "ARTIST") {
    return forbidden("Only artists can access analytics");
  }

  try {
    const analytics = await getArtistAnalytics(session.sub);
    return ok(analytics);
  } catch (err) {
    console.error("[GET /api/v1/analytics]", err);
    return serverError();
  }
}
