import { getSession } from "@/lib/auth";
import { limitOrNull } from "@/lib/redis";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/response";
import { updateBookingInquirySchema } from "@/lib/validations/user";
import { updateInquiryStatus } from "@/services/bookings";

// PATCH /api/v1/artists/me/inquiries/[id] — lue, acceptée ou refusée, avec un message facultatif
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const limited = await limitOrNull("inquiry-update", session.sub, 60, 600);
  if (limited) return limited;

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = updateBookingInquirySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    const result = await updateInquiryStatus(session.sub, id, parsed.data);
    if (!result) return notFound("Demande introuvable");
    return ok(result);
  } catch (err) {
    console.error("[PATCH /api/v1/artists/me/inquiries/[id]]", err);
    return serverError();
  }
}
