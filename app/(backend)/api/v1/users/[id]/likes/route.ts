import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, serverError } from "@/lib/response";
import { artistSelect } from "@/lib/selectors";
import { z } from "zod";
import type { NextRequest } from "next/server";

const querySchema = z.object({
  type: z.enum(["MIX", "TRACK", "all"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// GET /api/v1/users/[id]/likes — liste les likes d'un utilisateur
// Un utilisateur peut voir ses propres likes. Les admins peuvent voir ceux de n'importe qui.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: targetUserId } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  if (session.sub !== targetUserId && session.role !== "ADMIN") {
    return forbidden("Cannot view another user's likes");
  }

  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return ok({ items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } });
  }

  const { type, page, pageSize } = parsed.data;

  try {
    const where = {
      userId: targetUserId,
      ...(type !== "all" && { targetType: type as "MIX" | "TRACK" }),
    };

    const [total, likes] = await Promise.all([
      prisma.like.count({ where }),
      prisma.like.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          mix: {
            select: {
              id: true,
              slug: true,
              title: true,
              coverUrl: true,
              audioUrl: true,
              durationSec: true,
              genre: true,
              mixType: true,
              playCount: true,
              likeCount: true,
              publishedAt: true,
              artist: { select: artistSelect },
            },
          },
          track: {
            select: {
              id: true,
              slug: true,
              title: true,
              coverUrl: true,
              audioUrl: true,
              durationSec: true,
              genre: true,
              trackType: true,
              bpm: true,
              key: true,
              playCount: true,
              likeCount: true,
              publishedAt: true,
              artist: { select: artistSelect },
            },
          },
        },
      }),
    ]);

    return ok(
      likes.map((l: typeof likes[number]) => ({
        id: l.id,
        targetType: l.targetType,
        createdAt: l.createdAt.toISOString(),
        mix: l.mix
          ? {
              ...l.mix,
              publishedAt: l.mix.publishedAt?.toISOString() ?? null,
            }
          : null,
        track: l.track
          ? {
              ...l.track,
              publishedAt: l.track.publishedAt?.toISOString() ?? null,
            }
          : null,
      })),
      { meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
    );
  } catch (err) {
    console.error("[GET /api/v1/users/[id]/likes]", err);
    return serverError();
  }
}
