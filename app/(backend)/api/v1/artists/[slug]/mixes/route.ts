import { getArtistMixes } from "@/services/users";
import { ok, notFound, badRequest, serverError } from "@/lib/response";
import { z } from "zod";
import type { NextRequest } from "next/server";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// GET /api/v1/artists/[slug]/mixes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await params;
  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest("Invalid query params", parsed.error.flatten().fieldErrors);
  }

  try {
    const result = await getArtistMixes(slug, parsed.data.page, parsed.data.pageSize);
    return ok(result.items, { meta: result.meta });
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return notFound(e.message);
    console.error("[GET /api/v1/artists/[slug]/mixes]", err);
    return serverError();
  }
}
