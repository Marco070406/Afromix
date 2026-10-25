import { markAsRead, deleteNotification } from "@/services/notifications";
import { getSession } from "@/lib/auth";
import { ok, noContent, unauthorized, notFound, serverError } from "@/lib/response";

// PATCH /api/v1/notifications/[id] — marquer comme lue
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const ok_ = await markAsRead(id, session.sub);
    if (!ok_) return notFound("Notification not found");
    return ok({ read: true });
  } catch (err) {
    console.error("[PATCH /api/v1/notifications/[id]]", err);
    return serverError();
  }
}

// DELETE /api/v1/notifications/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const deleted = await deleteNotification(id, session.sub);
    if (!deleted) return notFound("Notification not found");
    return noContent();
  } catch (err) {
    console.error("[DELETE /api/v1/notifications/[id]]", err);
    return serverError();
  }
}
