import { getSession } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/response";
import { listSentInquiries } from "@/services/bookings";

// GET /api/v1/inquiries/sent — demandes de booking envoyées par l'utilisateur connecté
export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    return ok(await listSentInquiries(session.sub));
  } catch (err) {
    console.error("[GET /api/v1/inquiries/sent]", err);
    return serverError();
  }
}
