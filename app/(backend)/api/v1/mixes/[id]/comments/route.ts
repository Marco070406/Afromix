import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, created, badRequest, unauthorized, notFound, serverError } from "@/lib/response";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.string().optional(),
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

const userSelect = {
  id: true,
  profile: { select: { displayName: true, avatarUrl: true } },
} as const;

// GET /api/v1/mixes/[id]/comments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) return badRequest("Invalid query params");

  const { page, pageSize } = parsed.data;

  // Résout mix par slug ou id
  const mix = await prisma.mix.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true },
  });
  if (!mix) return notFound("Mix not found");

  try {
    const where = { mixId: mix.id, parentId: null };
    const [total, comments] = await Promise.all([
      prisma.comment.count({ where }),
      prisma.comment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: userSelect },
          replies: {
            take: 5,
            orderBy: { createdAt: "asc" },
            include: { user: { select: userSelect } },
          },
        },
      }),
    ]);

    return ok(
      comments.map(serializeComment),
      { meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
    );
  } catch (err) {
    console.error("[GET /api/v1/mixes/[id]/comments]", err);
    return serverError();
  }
}

// POST /api/v1/mixes/[id]/comments
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const mix = await prisma.mix.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true },
  });
  if (!mix) return notFound("Mix not found");

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  const { content, parentId } = parsed.data;

  try {
    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent) return notFound("Parent comment not found");
    }

    const comment = await prisma.comment.create({
      data: { userId: session.sub, mixId: mix.id, content, parentId },
      include: { user: { select: userSelect }, replies: true },
    });

    if (!parentId) {
      await prisma.mix.update({
        where: { id: mix.id },
        data: { commentCount: { increment: 1 } },
      });
    }

    return created(serializeComment(comment));
  } catch (err) {
    console.error("[POST /api/v1/mixes/[id]/comments]", err);
    return serverError();
  }
}

// ─── Serialiser ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeComment(c: any) {
  return {
    id: c.id,
    content: c.content,
    likeCount: c.likeCount,
    createdAt: c.createdAt.toISOString(),
    user: {
      id: c.user.id,
      displayName: c.user.profile?.displayName ?? "",
      avatarUrl: c.user.profile?.avatarUrl ?? null,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    replies: (c.replies ?? []).map((r: any) => ({
      id: r.id,
      content: r.content,
      likeCount: r.likeCount,
      createdAt: r.createdAt.toISOString(),
      user: {
        id: r.user.id,
        displayName: r.user.profile?.displayName ?? "",
        avatarUrl: r.user.profile?.avatarUrl ?? null,
      },
    })),
  };
}
