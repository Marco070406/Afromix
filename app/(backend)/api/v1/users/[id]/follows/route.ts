import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/response";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { artistSelect } from "@/lib/selectors";

const querySchema = z.object({
  direction: z.enum(["following", "followers"]).default("following"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// GET /api/v1/users/[id]/follows
// ?direction=following → qui cet utilisateur suit
// ?direction=followers → qui suit cet utilisateur (si c'est un artiste)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: targetUserId } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return ok({ items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } });
  }

  const { direction, page, pageSize } = parsed.data;

  try {
    if (direction === "following") {
      // Les artistes que cet utilisateur suit
      const where = { followerId: targetUserId };
      const [total, follows] = await Promise.all([
        prisma.follow.count({ where }),
        prisma.follow.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: {
            following: {
              select: {
                id: true,
                artistProfile: { select: artistSelect },
                profile: { select: { displayName: true, avatarUrl: true } },
              },
            },
          },
        }),
      ]);

      return ok(
        follows.map((f: typeof follows[number]) => ({
          id: f.id,
          createdAt: f.createdAt.toISOString(),
          user: {
            id: f.following.id,
            displayName: f.following.profile?.displayName ?? null,
            avatarUrl: f.following.profile?.avatarUrl ?? null,
            artistProfile: f.following.artistProfile ?? null,
          },
        })),
        { meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
      );
    } else {
      // Les utilisateurs qui suivent cet utilisateur
      const where = { followingId: targetUserId };
      const [total, follows] = await Promise.all([
        prisma.follow.count({ where }),
        prisma.follow.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: {
            follower: {
              select: {
                id: true,
                profile: { select: { displayName: true, avatarUrl: true } },
                artistProfile: { select: artistSelect },
              },
            },
          },
        }),
      ]);

      return ok(
        follows.map((f: typeof follows[number]) => ({
          id: f.id,
          createdAt: f.createdAt.toISOString(),
          user: {
            id: f.follower.id,
            displayName: f.follower.profile?.displayName ?? null,
            avatarUrl: f.follower.profile?.avatarUrl ?? null,
            artistProfile: f.follower.artistProfile ?? null,
          },
        })),
        { meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
      );
    }
  } catch (err) {
    console.error("[GET /api/v1/users/[id]/follows]", err);
    return serverError();
  }
}
