import { verifyPasswordResetToken } from "@/services/auth/tokens";
import { hashPassword } from "@/services/auth/password";
import { prisma } from "@/lib/prisma";
import { clearAuthCookies } from "@/lib/auth";
import { ok, badRequest, serverError } from "@/lib/response";
import { rateLimit, clientIp } from "@/lib/redis";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(1, "Token manquant"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Au moins une majuscule requise")
    .regex(/[0-9]/, "Au moins un chiffre requis"),
});

/**
 * POST /api/v1/auth/reset-password
 * Réinitialise le mot de passe avec un token valide.
 * Déconnecte toutes les sessions existantes après le reset.
 */
export async function POST(request: Request): Promise<Response> {
  if (!(await rateLimit(`reset:${clientIp(request.headers)}`, 10, 15 * 60)).allowed) {
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

  const { token, password } = parsed.data;

  try {
    // Vérifie le token
    const record = await verifyPasswordResetToken(token);
    if (!record) {
      return badRequest("Lien invalide ou expiré");
    }

    const passwordHash = await hashPassword(password);

    // Met à jour le mot de passe + consomme le token en une transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      // Consomme le token de reset
      prisma.passwordReset.update({
        where: { id: record.resetId },
        data: { usedAt: new Date() },
      }),
    ]);

    // Révoque les cookies de session actuels si présents
    await clearAuthCookies();

    return ok({ message: "Mot de passe réinitialisé avec succès" });
  } catch (err) {
    console.error("[POST /api/v1/auth/reset-password]", err);
    return serverError();
  }
}
