import { getSimilarMixes } from "@/services/recommendations";
import { getSession } from "@/lib/auth";
import { ok, serverError } from "@/lib/response";
import { z } from "zod";
import type { NextRequest } from "next/server";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).default(10),
});

// GET /api/v1/recommendations/similar-mixes/[slug]
// Mixes similaires (même genre + mixType).
// Si connecté, exclut les mixes déjà écoutés.
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
    const mixes = await getSimilarMixes(slug, limit, session?.sub);
    return ok(mixes);
  } catch (err) {
    console.error("[GET /recommendations/similar-mixes/[slug]]", err);
    return serverError();
  }
}
