import { prisma } from "@/lib/prisma";
import { sendEmailOtp } from "@/services/auth";
import { resendVerificationSchema } from "@/lib/validations/auth";
import { rateLimit, clientIp } from "@/lib/redis";
import { ok, badRequest, serverError, tooManyRequests } from "@/lib/response";

/**
 * POST /api/v1/auth/verify-email/resend
 * Body : { email } — renvoie un code de vérification si le compte existe et n'est pas vérifié.
 * Réponse identique dans tous les cas, pour ne pas révéler quelles adresses sont inscrites.
 * Fréquence limitée par IP ici, et par adresse dans sendEmailOtp (1 / min, 5 / h).
 */
export async function POST(request: Request): Promise<Response> {
  if (!(await rateLimit(`otp-resend:${clientIp(request.headers)}`, 10, 60 * 60)).allowed) {
    return tooManyRequests();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = resendVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: { id: true, email: true, emailVerified: true, deletedAt: true, profile: { select: { displayName: true } } },
    });
    if (user && !user.emailVerified && !user.deletedAt) {
      await sendEmailOtp({ id: user.id, email: user.email, displayName: user.profile?.displayName });
    }
    return ok({ message: "Si un compte non vérifié existe pour cette adresse, un nouveau code a été envoyé." });
  } catch (err) {
    console.error("[POST /api/v1/auth/verify-email/resend]", err);
    return serverError();
  }
}
