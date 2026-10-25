/**
 * Secret et vérification des JWT — module sans dépendance à next/headers,
 * partagé par lib/auth.ts (Route Handlers) et proxy.ts (couche proxy).
 */
import { jwtVerify } from "jose";

export type TokenType = "access" | "refresh";

const DEV_FALLBACK_SECRET = "dev-only-secret-not-for-production-use!!";

function loadSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return new TextEncoder().encode(secret);
  // En production, un secret absent ou court permettrait de forger des jetons (admin compris)
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET manquant ou trop court (32 caractères minimum) : refus de démarrer.");
  }
  return new TextEncoder().encode(DEV_FALLBACK_SECRET);
}

export const JWT_SECRET = loadSecret();

/** Vérifie la signature, l'expiration et le type du jeton (un refresh n'ouvre pas de session). */
export async function verifyTypedToken<T>(token: string, type: TokenType): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ["HS256"] });
    return payload.typ === type ? (payload as T) : null;
  } catch {
    return null;
  }
}
