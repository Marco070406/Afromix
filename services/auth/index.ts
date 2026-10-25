import { prisma } from "@/lib/prisma";
import { setAuthCookies } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/redis";
import { hashPassword, verifyPassword } from "./password";
import { createEmailOtp } from "./tokens";
import type { RegisterInput, LoginInput } from "@/lib/validations/auth";

export interface AuthResult {
  userId: string;
  email: string;
  role: string;
  emailVerified: boolean;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResult {
  userId: string;
  email: string;
  role: string;
  emailVerified: false;
  /** L'adresse doit être confirmée par code avant toute connexion */
  verificationRequired: true;
}

/**
 * Envoie un nouveau code de vérification, au plus 1 par minute et 5 par heure
 * pour une même adresse (protège la boîte mail du destinataire et le quota SMTP).
 * Retourne false si la limite est atteinte : le code envoyé précédemment reste valable.
 */
export async function sendEmailOtp(user: { id: string; email: string; displayName?: string | null }): Promise<boolean> {
  const email = user.email.toLowerCase();
  const perMinute = await rateLimit(`otp-send-min:${email}`, 1, 60);
  const perHour = perMinute.allowed ? await rateLimit(`otp-send-hour:${email}`, 5, 60 * 60) : perMinute;
  if (!perMinute.allowed || !perHour.allowed) return false;

  try {
    const code = await createEmailOtp(user.id);
    const result = await sendVerificationEmail(user.email, user.displayName ?? "", code);
    if (!result.ok) console.warn("[auth] Verification email not sent:", result.error);
    return result.ok;
  } catch (err) {
    console.error("[auth] Failed to send verification code:", err);
    return false;
  }
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  // Check for existing user
  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (existing) {
    throw Object.assign(new Error("Email already in use"), { status: 409 });
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role === "ARTIST" ? "ARTIST" : "USER",
      profile: {
        create: {
          displayName: input.displayName,
        },
      },
      ...(input.role === "ARTIST" && {
        artistProfile: {
          create: {
            stageName: input.displayName,
            slug: generateSlug(input.displayName),
          },
        },
      }),
    },
  });

  // Pas de session à l'inscription : l'utilisateur est connecté seulement après avoir
  // saisi le code reçu par e-mail (POST /api/v1/auth/verify-email). Si l'envoi échoue,
  // le compte reste créé et un nouveau code peut être demandé.
  await sendEmailOtp({ id: user.id, email: user.email, displayName: input.displayName });

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    emailVerified: false,
    verificationRequired: true,
  };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    include: { profile: { select: { displayName: true } } },
  });

  if (!user || !user.passwordHash) {
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  }

  // Mot de passe vérifié avant tout autre statut : un tiers sans le mot de passe
  // ne doit pas apprendre qu'un compte est suspendu ou non vérifié.
  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  }

  if (user.deletedAt) {
    throw Object.assign(new Error("Account suspended"), { status: 403 });
  }

  if (!user.emailVerified) {
    // Nouveau code envoyé (dans la limite de fréquence) ; la connexion se fera après sa saisie
    await sendEmailOtp({ id: user.id, email: user.email, displayName: user.profile?.displayName });
    throw Object.assign(new Error("Email not verified"), { status: 403, code: "EMAIL_NOT_VERIFIED", email: user.email });
  }

  const { accessToken, refreshToken } = await setAuthCookies(user.id, user.role);

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    emailVerified: true,
    accessToken,
    refreshToken,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}
