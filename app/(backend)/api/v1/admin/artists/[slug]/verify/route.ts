import { setArtistVerification } from "@/services/admin";
import { getSession } from "@/lib/auth";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/response";
import { getClientIp } from "@/lib/request";
import { z } from "zod";

const bodySchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  note: z.string().max(500).optional(),
});

// POST /api/v1/admin/artists/[slug]/verify
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await params;
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
    await setArtistVerification(session.sub, slug, parsed.data.status, parsed.data.note, getClientIp(request));
    return ok({
      message: parsed.data.status === "VERIFIED" ? "Artist verified" : "Verification rejected",
      status: parsed.data.status,
    });
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return notFound(e.message);
    console.error("[POST /api/v1/admin/artists/[slug]/verify]", err);
    return serverError();
  }
}
