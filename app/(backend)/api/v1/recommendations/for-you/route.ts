import { getForYouFeed, getTrending } from "@/services/recommendations";
import { getSession } from "@/lib/auth";
import { ok, serverError } from "@/lib/response";
import { z } from "zod";
import type { NextRequest } from "next/server";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// GET /api/v1/recommendations/for-you
// Feed personnalisé "Pour toi".
// Connecté  → feed basé sur follows + genres + historique d'écoute.
// Anonyme   → trending global.
export async function GET(request: NextRequest): Promise<Response> {
  const session = await getSession();

  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(raw);
  const limit = parsed.success ? parsed.data.limit : 20;

  try {
    if (!session) {
      const mixes = await getTrending(limit);
      return ok({
        mixes,
        tracks: [],
        artists: [],
        reason: {
          basedOnFollows: false,
          basedOnListens: false,
          basedOnLikes: false,
          topGenres: [],
        },
      });
    }

    const feed = await getForYouFeed(session.sub, limit);
    return ok(feed);
  } catch (err) {
    console.error("[GET /recommendations/for-you]", err);
    return serverError();
  }
}
