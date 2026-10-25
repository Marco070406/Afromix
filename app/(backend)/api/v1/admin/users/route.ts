import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, serverError } from "@/lib/response";
import { z } from "zod";
import type { NextRequest } from "next/server";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().max(100).optional(),
  role: z.enum(["USER", "ARTIST", "ADMIN"]).optional(),
  suspended: z.enum(["true", "false"]).optional(),
});

// GET /api/v1/admin/users — liste tous les utilisateurs
export async function GET(request: NextRequest): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.role !== "ADMIN") return forbidden();

  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(raw);
  const { page, pageSize, q, role, suspended } = parsed.success
    ? parsed.data
    : { page: 1, pageSize: 20, q: undefined, role: undefined, suspended: undefined };

  const where = {
    ...(role && { role }),
    ...(suspended === "true" && { deletedAt: { not: null } }),
    ...(suspended === "false" && { deletedAt: null }),
    ...(q && {
      OR: [
        { email: { contains: q, mode: "insensitive" as const } },
        { profile: { displayName: { contains: q, mode: "insensitive" as const } } },
      ],
    }),
  };

  try {
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          role: true,
          deletedAt: true,
          createdAt: true,
          profile: { select: { displayName: true, avatarUrl: true, country: true } },
          artistProfile: { select: { slug: true, stageName: true, verified: true, verificationStatus: true } },
        },
      }),
    ]);

    return ok(
      users.map((u: typeof users[number]) => ({
        ...u,
        suspended: !!u.deletedAt,
        emailVerified: !!u.emailVerified,
        createdAt: u.createdAt.toISOString(),
        deletedAt: u.deletedAt?.toISOString() ?? null,
      })),
      { meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
    );
  } catch (err) {
    console.error("[GET /api/v1/admin/users]", err);
    return serverError();
  }
}
