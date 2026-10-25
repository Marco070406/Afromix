import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// ─── Token generation ─────────────────────────────────────────────────────────

/**
 * Génère un token URL-safe de 32 bytes (64 caractères hex).
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ─── Email verification ───────────────────────────────────────────────────────

const EMAIL_VERIFY_TTL_HOURS = 24;

/**
 * Crée (ou renouvelle) un token de vérification d'email pour un utilisateur.
 * Invalide les anciens tokens non utilisés.
 */
export async function createEmailVerificationToken(
  userId: string
): Promise<string> {
  // Invalide les anciens tokens non utilisés
  await prisma.emailVerification.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = generateToken();
  const expiresAt = new Date(
    Date.now() + EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000
  );

  await prisma.emailVerification.create({
    data: { userId, token, expiresAt },
  });

  return token;
}

/**
 * Vérifie un token d'email. Retourne le userId si valide, null sinon.
 * Marque le token comme utilisé et met à jour emailVerified sur le User.
 */
export async function consumeEmailVerificationToken(
  token: string
): Promise<{ userId: string } | null> {
  const record = await prisma.emailVerification.findUnique({
    where: { token },
  });

  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;

  // Marque comme utilisé et vérifie l'email en une transaction
  await prisma.$transaction([
    prisma.emailVerification.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
  ]);

  return { userId: record.userId };
}

// ─── Password reset ───────────────────────────────────────────────────────────

const PASSWORD_RESET_TTL_HOURS = 1;

/**
 * Crée un token de réinitialisation de mot de passe.
 * Invalide les anciens tokens non utilisés.
 */
export async function createPasswordResetToken(
  userId: string
): Promise<string> {
  await prisma.passwordReset.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = generateToken();
  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_TTL_HOURS * 60 * 60 * 1000
  );

  await prisma.passwordReset.create({
    data: { userId, token, expiresAt },
  });

  return token;
}

/**
 * Vérifie un token de reset. Retourne le userId si valide, null sinon.
 * Ne consomme PAS le token — c'est fait après avoir changé le mot de passe.
 */
export async function verifyPasswordResetToken(
  token: string
): Promise<{ userId: string; resetId: string } | null> {
  const record = await prisma.passwordReset.findUnique({
    where: { token },
  });

  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;

  return { userId: record.userId, resetId: record.id };
}

/**
 * Consomme le token de reset après avoir changé le mot de passe.
 */
export async function consumePasswordResetToken(
  resetId: string
): Promise<void> {
  await prisma.passwordReset.update({
    where: { id: resetId },
    data: { usedAt: new Date() },
  });
}
