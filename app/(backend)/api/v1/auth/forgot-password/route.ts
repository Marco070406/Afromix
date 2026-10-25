import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { createPasswordResetToken } from "@/services/auth/tokens";
import { ok, badRequest, serverError } from "@/lib/response";
import { rateLimit, clientIp } from "@/lib/redis";
import { z } from "zod";

const schema = z.object({
  email: z.email("Email invalide"),
});

/**
 * POST /api/v1/auth/forgot-password
 * Envoie un email de réinitialisation de mot de passe.
 *
 * IMPORTANT : on répond toujours 200 même si l'email n'existe pas,
 * pour ne pas divulguer quels emails sont enregistrés (user enumeration).
 */
export async function POST(request: Request): Promise<Response> {
  const ip = clientIp(request.headers);
  if (!(await rateLimit(`forgot:${ip}`, 5, 15 * 60)).allowed) {
    return Response.json({ success: false, error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  // 3 demandes par heure et par adresse ; au-delà on répond comme d'habitude sans envoyer
  const perEmail = await rateLimit(`forgot-email:${parsed.data.email.toLowerCase()}`, 3, 60 * 60);

  // Réponse identique que l'utilisateur existe ou non
  const SAFE_RESPONSE = ok({
    message: "Si cet email est enregistré, un lien de réinitialisation a été envoyé.",
  });

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: {
        id: true,
        email: true,
        deletedAt: true,
        profile: { select: { displayName: true } },
      },
    });

    // Ne rien faire si l'utilisateur n'existe pas ou est suspendu
    if (!user || user.deletedAt || !perEmail.allowed) return SAFE_RESPONSE;

    const token = await createPasswordResetToken(user.id);
    await sendPasswordResetEmail(
      user.email,
      user.profile?.displayName ?? "there",
      token
    );

    return SAFE_RESPONSE;
  } catch (err) {
    console.error("[POST /api/v1/auth/forgot-password]", err);
    return serverError();
  }
}
