import { suspendUser } from "@/services/admin";
import { getSession } from "@/lib/auth";
import { ok, badRequest, unauthorized, forbidden, notFound, conflict, serverError } from "@/lib/response";
import { getClientIp } from "@/lib/request";
import { z } from "zod";

const bodySchema = z.object({
  reason: z.string().max(500).optional(),
});

// POST /api/v1/admin/users/[id]/suspend
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.role !== "ADMIN") return forbidden();
  if (id === session.sub) return badRequest("Cannot suspend your own account");

  let body: unknown = {};
  try { body = await request.json(); } catch { /* body optional */ }
  const parsed = bodySchema.safeParse(body);

  try {
    await suspendUser(session.sub, id, parsed.success ? parsed.data.reason : undefined, getClientIp(request));
    return ok({ message: "User suspended" });
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return notFound(e.message);
    if (e.status === 409) return conflict(e.message);
    console.error("[POST /api/v1/admin/users/[id]/suspend]", err);
    return serverError();
  }
}
