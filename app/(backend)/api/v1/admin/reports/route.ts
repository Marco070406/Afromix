import { listReports } from "@/services/admin";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, serverError } from "@/lib/response";
import { z } from "zod";
import type { NextRequest } from "next/server";

const querySchema = z.object({
  status: z.enum(["PENDING", "REVIEWED", "DISMISSED", "ACTION_TAKEN"]).optional(),
  targetType: z.enum(["MIX", "TRACK", "USER", "COMMENT", "ALBUM"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /api/v1/admin/reports
export async function GET(request: NextRequest): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.role !== "ADMIN") return forbidden();

  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(raw);
  const opts = parsed.success ? parsed.data : { page: 1, pageSize: 20 };

  try {
    const result = await listReports(opts);
    return ok(
      result.items.map((r: typeof result.items[number]) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
      })),
      { meta: result.meta }
    );
  } catch (err) {
    console.error("[GET /api/v1/admin/reports]", err);
    return serverError();
  }
}
