import { getTopContent } from "@/services/analytics";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, serverError } from "@/lib/response";
import { z } from "zod";
import type { NextRequest } from "next/server";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sortBy: z.enum(["playCount", "likeCount", "commentCount"]).default("playCount"),
  userId: z.string().optional(),
});

// GET /api/v1/analytics/top-content
// Top mixes et tracks de l'artiste, triés par plays/likes/commentaires.
export async function GET(request: NextRequest): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.role !== "ARTIST" && session.role !== "ADMIN") {
    return forbidden("Only artists can access analytics");
  }

  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(raw);
  const { limit, sortBy, userId } = parsed.success
    ? parsed.data
    : { limit: 10, sortBy: "playCount" as const, userId: undefined };

  // Un admin peut consulter les analytics d'un autre artiste via ?userId=
  if (session.role === "ADMIN" && !userId) {
    return forbidden("Admins must specify a userId");
  }
  const targetUserId = session.role === "ADMIN" && userId ? userId : session.sub;

  try {
    const result = await getTopContent(targetUserId, limit, sortBy);
    return ok(result);
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return forbidden("Artist profile not found");
    console.error("[GET /api/v1/analytics/top-content]", err);
    return serverError();
  }
}
