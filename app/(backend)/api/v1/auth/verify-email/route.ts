import { verifyEmailOtp, EMAIL_OTP_MAX_ATTEMPTS } from "@/services/auth/tokens";
import { verifyEmailSchema } from "@/lib/validations/auth";
import { setAuthCookies } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/redis";
import { ok, badRequest, serverError, tooManyRequests } from "@/lib/response";

/**
 * POST /api/v1/auth/verify-email
 * Body : { email, code } — code à 6 chiffres reçu par e-mail à l'inscription.
 * Un code correct confirme l'adresse et ouvre la session (cookies d'authentification).
 * Les essais sont limités par code (EMAIL_OTP_MAX_ATTEMPTS) et par IP.
 */
export async function POST(request: Request): Promise<Response> {
  if (!(await rateLimit(`otp-verify:${clientIp(request.headers)}`, 20, 15 * 60)).allowed) {
    return tooManyRequests();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    const result = await verifyEmailOtp(parsed.data.email, parsed.data.code);

    if (!result.ok) {
      // Même message pour une adresse inconnue et un code expiré : pas d'énumération des comptes
      const reason = result.reason === "unknown" ? "expired" : result.reason;
      return badRequest("Invalid verification code", {
        reason,
        attemptsLeft: result.reason === "invalid" ? result.attemptsLeft : undefined,
        maxAttempts: EMAIL_OTP_MAX_ATTEMPTS,
      });
    }

    await setAuthCookies(result.userId, result.role);
    return ok({ userId: result.userId, role: result.role, emailVerified: true });
  } catch (err) {
    console.error("[POST /api/v1/auth/verify-email]", err);
    return serverError();
  }
}
