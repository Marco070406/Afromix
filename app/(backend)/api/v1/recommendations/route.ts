import { getRecommendations, getTrending } from "@/services/recommendations";
import { getSession } from "@/lib/auth";
import { ok, serverError } from "@/lib/response";
import type { NextRequest } from "next/server";

// GET /api/v1/recommendations
// Connecté  → mixes + tracks + artistes personnalisés
// Anonyme   → trending mixes seulement
export async function GET(request: NextRequest): Promise<Response> {
  const limit = Math.min(
    Number(request.nextUrl.searchParams.get("limit") ?? "20"),
    50
  );

  try {
    const session = await getSession();

    if (session) {
      const result = await getRecommendations(session.sub, limit);
      return ok(result);
    } else {
      // Fallback anonyme
      const mixes = await getTrending(limit);
      return ok({ mixes, tracks: [], artists: [] });
    }
  } catch (err) {
    console.error("[GET /api/v1/recommendations]", err);
    return serverError();
  }
}
