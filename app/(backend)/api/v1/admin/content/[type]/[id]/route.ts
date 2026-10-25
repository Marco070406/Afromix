import { setContentStatus, type ContentType, type ContentStatus } from "@/services/admin";
import { getSession } from "@/lib/auth";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/response";
import { getClientIp } from "@/lib/request";
import { z } from "zod";

const bodySchema = z.object({
  status: z.enum(["DRAFT", "PROCESSING", "PUBLISHED", "UNLISTED", "REMOVED"]),
  reason: z.string().max(500).optional(),
});

// PATCH /api/v1/admin/content/[type]/[id]
// type = "mix" | "track" | "album"
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
): Promise<Response> {
  const { type, id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.role !== "ADMIN") return forbidden();

  if (!["mix", "track", "album"].includes(type)) {
    return badRequest(`Invalid content type "${type}". Must be mix, track or album.`);
  }

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    await setContentStatus(
      session.sub,
      type as ContentType,
      id,
      parsed.data.status as ContentStatus,
      parsed.data.reason,
      getClientIp(request)
    );
    return ok({ message: `Content status updated to ${parsed.data.status}`, status: parsed.data.status });
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return notFound(e.message);
    console.error("[PATCH /api/v1/admin/content/[type]/[id]]", err);
    return serverError();
  }
}
