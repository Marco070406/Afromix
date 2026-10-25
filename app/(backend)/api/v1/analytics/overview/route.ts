import { getOverview } from "@/services/analytics";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, serverError } from "@/lib/response";
import { z } from "zod";
import type { NextRequest } from "next/server";

const querySchema = z.object({
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
  // Admin peut interroger les analytics d'un autre artiste
  userId: z.string().optional(),
});

// GET /api/v1/analytics/overview
export async function GET(request: NextRequest): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.role !== "ARTIST" && session.role !== "ADMIN") {
    return forbidden("Only artists can access analytics");
  }

  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(raw);
  const { period, userId } = parsed.success
    ? parsed.data
    : { period: "30d" as const, userId: undefined };

  // Un admin peut consulter les analytics d'un autre artiste via ?userId=
  if (session.role === "ADMIN" && !userId) {
    return forbidden("Admins must specify a userId");
  }
  const targetUserId = session.role === "ADMIN" && userId ? userId : session.sub;

  try {
    const overview = await getOverview(targetUserId, period);
    return ok(overview);
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) {
      return forbidden("Artist profile not found for this account");
    }
    console.error("[GET /api/v1/analytics/overview]", err);
    return serverError();
  }
}
