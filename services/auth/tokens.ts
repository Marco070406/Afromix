import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { JWT_SECRET } from "@/lib/jwt";

// ─── Token generation ─────────────────────────────────────────────────────────

/**
 * Génère un token URL-safe de 32 bytes (64 caractères hex).
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ─── Email verification (code OTP) ────────────────────────────────────────────

export const EMAIL_OTP_TTL_MINUTES = 10;
export const EMAIL_OTP_MAX_ATTEMPTS = 5;

/**
 * Empreinte HMAC du code, liée à l'utilisateur et salée par le secret serveur :
 * le code n'est jamais stocké en clair, et une fuite de la base ne permet pas
 * de retrouver les codes en essayant le million de combinaisons hors ligne.
 */
function hashOtp(userId: string, code: string): string {
  return crypto.createHmac("sha256", JWT_SECRET).update(`${userId}:${code}`).digest("hex");
}

/**
 * Crée un nouveau code à 6 chiffres pour l'utilisateur et invalide les précédents.
 * Retourne le code en clair, à envoyer par e-mail uniquement.
 */
export async function createEmailOtp(userId: string): Promise<string> {
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MINUTES * 60 * 1000);

  await prisma.$transaction([
    prisma.emailVerification.deleteMany({ where: { userId } }),
    prisma.emailVerification.create({ data: { userId, token: hashOtp(userId, code), expiresAt } }),
  ]);

  return code;
}

export type EmailOtpResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; reason: "invalid"; attemptsLeft: number }
  | { ok: false; reason: "expired" | "too_many_attempts" | "already_verified" | "unknown" };

/**
 * Vérifie le code saisi pour une adresse e-mail. En cas de succès, marque l'adresse
 * comme vérifiée. Chaque erreur consomme un essai ; au-delà de la limite le code
 * est invalidé et il faut en demander un nouveau.
 */
export async function verifyEmailOtp(email: string, code: string): Promise<EmailOtpResult> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, role: true, emailVerified: true, deletedAt: true },
  });
  if (!user || user.deletedAt) return { ok: false, reason: "unknown" };
  if (user.emailVerified) return { ok: false, reason: "already_verified" };

  const record = await prisma.emailVerification.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!record || record.expiresAt < new Date()) return { ok: false, reason: "expired" };
  if (record.attempts >= EMAIL_OTP_MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

  const expected = Buffer.from(record.token, "hex");
  const given = Buffer.from(hashOtp(user.id, code), "hex");
  const matches = expected.length === given.length && crypto.timingSafeEqual(expected, given);

  if (!matches) {
    const attempts = record.attempts + 1;
    await prisma.emailVerification.update({
      where: { id: record.id },
      data: { attempts, ...(attempts >= EMAIL_OTP_MAX_ATTEMPTS && { usedAt: new Date() }) },
    });
    return attempts >= EMAIL_OTP_MAX_ATTEMPTS
      ? { ok: false, reason: "too_many_attempts" }
      : { ok: false, reason: "invalid", attemptsLeft: EMAIL_OTP_MAX_ATTEMPTS - attempts };
  }

  await prisma.$transaction([
    prisma.emailVerification.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } }),
  ]);
  return { ok: true, userId: user.id, role: user.role };
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
