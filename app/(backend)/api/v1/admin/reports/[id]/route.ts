import { processReport } from "@/services/admin";
import { getSession } from "@/lib/auth";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/response";
import { getClientIp } from "@/lib/request";
import { z } from "zod";

const bodySchema = z.object({
  status: z.enum(["REVIEWED", "DISMISSED", "ACTION_TAKEN"]),
  note: z.string().max(1000).optional(),
});

// PATCH /api/v1/admin/reports/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.role !== "ADMIN") return forbidden();

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    await processReport(session.sub, id, parsed.data.status, parsed.data.note, getClientIp(request));
    return ok({ message: `Report ${parsed.data.status.toLowerCase()}` });
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return notFound(e.message);
    console.error("[PATCH /api/v1/admin/reports/[id]]", err);
    return serverError();
  }
}
