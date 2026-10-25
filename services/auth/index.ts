import { prisma } from "@/lib/prisma";
import { setAuthCookies } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { hashPassword, verifyPassword } from "./password";
import { createEmailVerificationToken } from "./tokens";
import type { RegisterInput, LoginInput } from "@/lib/validations/auth";

export interface AuthResult {
  userId: string;
  email: string;
  role: string;
  emailVerified: boolean;
  accessToken: string;
  refreshToken: string;
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
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

  // Envoi de l'email de vérification — non bloquant :
  // si l'envoi échoue, l'inscription reste valide.
  // L'utilisateur peut redemander via POST /api/v1/auth/verify-email.
  try {
    const token = await createEmailVerificationToken(user.id);
    const sendResult = await sendVerificationEmail(user.email, input.displayName, token);
    if (!sendResult.ok) {
      console.warn("[register] Verification email sending was not successful:", sendResult.error);
    }
  } catch (err) {
    console.error("[register] Failed to send verification email:", err);
  }

  const { accessToken, refreshToken } = await setAuthCookies(user.id, user.role);

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    emailVerified: false,
    accessToken,
    refreshToken,
  };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (!user || !user.passwordHash) {
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  }

  if (user.deletedAt) {
    throw Object.assign(new Error("Account suspended"), { status: 403 });
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  }

  const { accessToken, refreshToken } = await setAuthCookies(user.id, user.role);

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    emailVerified: !!user.emailVerified,
    accessToken,
    refreshToken,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}
