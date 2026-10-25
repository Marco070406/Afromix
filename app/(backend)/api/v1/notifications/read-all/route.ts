import { markAllAsRead } from "@/services/notifications";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/response";

// PATCH /api/v1/notifications/read-all
export async function PATCH(): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const count = await markAllAsRead(session.sub);
    return ok({ marked: count, message: `${count} notifications marquées comme lues` });
  } catch (err) {
    console.error("[PATCH /api/v1/notifications/read-all]", err);
    return serverError();
  }
}
