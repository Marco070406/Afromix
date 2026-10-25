import { listAuditLogs } from "@/services/admin";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, serverError } from "@/lib/response";
import { z } from "zod";
import type { NextRequest } from "next/server";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  actorId: z.string().optional(),
  action: z.string().optional(),
});

// GET /api/v1/admin/audit-logs
export async function GET(request: NextRequest): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.role !== "ADMIN") return forbidden();

  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(raw);
  const { page, pageSize, actorId, action } = parsed.success
    ? parsed.data
    : { page: 1, pageSize: 50, actorId: undefined, action: undefined };

  try {
    const result = await listAuditLogs(page, pageSize, actorId, action);
    return ok(
      result.items.map((l: typeof result.items[number]) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
      { meta: result.meta }
    );
  } catch (err) {
    console.error("[GET /api/v1/admin/audit-logs]", err);
    return serverError();
  }
}
