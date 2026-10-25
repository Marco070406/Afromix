import { getSession } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, unauthorized, serverError } from "@/lib/response";
import { createEmailVerificationToken } from "@/services/auth/tokens";
import { rateLimit } from "@/lib/redis";

/**
 * POST /api/v1/auth/verify-email
 * Renvoie un email de vérification à l'utilisateur connecté.
 * Utile si le premier email n'est pas arrivé.
 */
export async function POST(): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  // Renvoi de l'e-mail de vérification : 3 par heure et par compte
  if (!(await rateLimit(`verify-email:${session.sub}`, 3, 60 * 60)).allowed) {
    return Response.json({ success: false, error: "Too many requests" }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      profile: { select: { displayName: true } },
    },
  });

  if (!user) return unauthorized();

  if (user.emailVerified) {
    return badRequest("Email already verified");
  }

  try {
    const token = await createEmailVerificationToken(user.id);
    await sendVerificationEmail(
      user.email,
      user.profile?.displayName ?? "there",
      token
    );
    return ok({ message: "Verification email sent" });
  } catch (err) {
    console.error("[POST /api/v1/auth/verify-email]", err);
    return serverError();
  }
}
