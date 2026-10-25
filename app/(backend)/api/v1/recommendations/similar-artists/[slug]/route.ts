import { getSimilarArtists } from "@/services/recommendations";
import { getSession } from "@/lib/auth";
import { ok, serverError } from "@/lib/response";
import { z } from "zod";
import type { NextRequest } from "next/server";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).default(10),
});

// GET /api/v1/recommendations/similar-artists/[slug]
// Artistes similaires au profil [slug] (même genres/pays).
// Si l'utilisateur est connecté, exclut les artistes qu'il suit déjà.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await params;
  const session = await getSession();

  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(raw);
  const limit = parsed.success ? parsed.data.limit : 10;

  try {
    const artists = await getSimilarArtists(slug, limit, session?.sub);
    return ok(artists);
  } catch (err) {
    console.error("[GET /recommendations/similar-artists/[slug]]", err);
    return serverError();
  }
}
