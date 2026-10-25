import { getPlaysSeries } from "@/services/analytics";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, serverError } from "@/lib/response";
import { z } from "zod";
import type { NextRequest } from "next/server";

const querySchema = z.object({
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
  granularity: z.enum(["day", "week", "month"]).optional(),
  userId: z.string().optional(),
});

// GET /api/v1/analytics/plays
// Retourne les séries temporelles de plays (mixes + tracks) sur la période.
export async function GET(request: NextRequest): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.role !== "ARTIST" && session.role !== "ADMIN") {
    return forbidden("Only artists can access analytics");
  }

  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(raw);
  const { period, granularity, userId } = parsed.success
    ? parsed.data
    : { period: "30d" as const, granularity: undefined, userId: undefined };

  // Un admin peut consulter les analytics d'un autre artiste via ?userId=
  if (session.role === "ADMIN" && !userId) {
    return forbidden("Admins must specify a userId");
  }
  const targetUserId = session.role === "ADMIN" && userId ? userId : session.sub;

  try {
    const series = await getPlaysSeries(targetUserId, period, granularity);
    return ok({ series, period, granularity: granularity ?? "auto" });
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return forbidden("Artist profile not found");
    console.error("[GET /api/v1/analytics/plays]", err);
    return serverError();
  }
}
