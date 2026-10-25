import { cookies } from "next/headers";
import { SignJWT } from "jose";
import { JWT_SECRET, verifyTypedToken, type TokenType } from "@/lib/jwt";

// ─── Config ───────────────────────────────────────────────────────────────────

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";
const COOKIE_NAME_ACCESS = "afromix_access";
const COOKIE_NAME_REFRESH = "afromix_refresh";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;   // userId
  role: string;
  iat?: number;
  exp?: number;
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

export async function signAccessToken(payload: Omit<JwtPayload, "iat" | "exp">) {
  return new SignJWT({ ...payload, typ: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(JWT_SECRET);
}

export async function signRefreshToken(userId: string) {
  return new SignJWT({ sub: userId, typ: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(JWT_SECRET);
}

/** Vérifie un jeton du type attendu (par défaut : accès). */
export async function verifyToken(token: string, type: TokenType = "access"): Promise<JwtPayload | null> {
  return verifyTypedToken<JwtPayload>(token, type);
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

export async function setAuthCookies(userId: string, role: string) {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ sub: userId, role }),
    signRefreshToken(userId),
  ]);

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME_ACCESS, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15, // 15 min
  });

  cookieStore.set(COOKIE_NAME_REFRESH, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return { accessToken, refreshToken };
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME_ACCESS);
  cookieStore.delete(COOKIE_NAME_REFRESH);
}

// ─── Session helpers ──────────────────────────────────────────────────────────

/**
 * Reads the access token from cookies and returns the decoded payload.
 * Returns null if no valid token is found.
 * Safe to call from Server Components and Route Handlers.
 */
export async function getSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME_ACCESS)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Like getSession() but throws a 401-style error if no session exists.
 * Use in Route Handlers that require authentication.
 */
export async function requireSession(): Promise<JwtPayload> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Unauthorized", 401);
  }
  return session;
}

/**
 * Requires the user to have a specific role.
 */
export async function requireRole(role: string): Promise<JwtPayload> {
  const session = await requireSession();
  if (session.role !== role) {
    throw new AuthError("Forbidden", 403);
  }
  return session;
}

// ─── Auth error ───────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// ─── Password helpers (delegated to services/auth) ───────────────────────────
// bcryptjs is imported in services/auth/password.ts to keep this file edge-safe.
