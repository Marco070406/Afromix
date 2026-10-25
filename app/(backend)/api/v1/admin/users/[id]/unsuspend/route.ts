import { unsuspendUser } from "@/services/admin";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, notFound, conflict, serverError } from "@/lib/response";
import { getClientIp } from "@/lib/request";

// POST /api/v1/admin/users/[id]/unsuspend
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.role !== "ADMIN") return forbidden();

  try {
    await unsuspendUser(session.sub, id, getClientIp(request));
    return ok({ message: "User unsuspended" });
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return notFound(e.message);
    if (e.status === 409) return conflict(e.message);
    console.error("[POST /api/v1/admin/users/[id]/unsuspend]", err);
    return serverError();
  }
}
