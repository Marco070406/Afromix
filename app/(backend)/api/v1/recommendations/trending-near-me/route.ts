import { getTrendingByCountry, getTrending } from "@/services/recommendations";
import { getSession } from "@/lib/auth";
import { ok, serverError } from "@/lib/response";
import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  country: z.string().max(2).optional(), // override manuel (ex: ?country=FR)
});

// GET /api/v1/recommendations/trending-near-me
// Trending filtré par pays du user connecté.
// Résolution du pays : 1) ?country= param, 2) profil user, 3) header CF-IPCountry, 4) fallback global.
export async function GET(
  request: NextRequest
): Promise<Response> {
  const session = await getSession();
  const headersList = await headers();

  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(raw);
  const limit = parsed.success ? parsed.data.limit : 20;
  const countryOverride = parsed.success ? parsed.data.country : undefined;

  try {
    // Résolution du pays
    let country: string | null = countryOverride ?? null;

    if (!country && session) {
      // Depuis le profil utilisateur
      const profile = await prisma.user.findUnique({
        where: { id: session.sub },
        select: { profile: { select: { country: true } } },
      });
      country = profile?.profile?.country ?? null;
    }

    if (!country) {
      // Depuis le header Cloudflare
      country = headersList.get("cf-ipcountry") ?? null;
    }

    if (!country) {
      // Fallback global
      const mixes = await getTrending(limit);
      return ok({ mixes, country: null, fallback: true });
    }

    const mixes = await getTrendingByCountry(country, limit);
    return ok({ mixes, country, fallback: false });
  } catch (err) {
    console.error("[GET /recommendations/trending-near-me]", err);
    return serverError();
  }
}
