/**
 * AfroMix — Proxy (Next.js 16 renamed middleware → proxy)
 *
 * Responsibilities:
 * 1. Protect /dashboard and /admin routes — redirect to /login if no valid token
 * 2. Protect /api/v1 routes — return 401 JSON if no valid token (where required)
 * 3. Add security headers to all responses
 *
 * NOTE: Heavy auth logic lives in lib/auth.ts (Route Handlers / Server Components).
 * The proxy only does a lightweight JWT check on the access cookie to avoid
 * running Prisma or Redis in the edge/proxy layer.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyTypedToken } from "@/lib/jwt";

// ─── Config ───────────────────────────────────────────────────────────────────

const COOKIE_NAME_ACCESS = "afromix_access";

// Routes that require authentication (matched as prefixes)
const PROTECTED_PAGE_PREFIXES = ["/dashboard", "/admin"];
const PROTECTED_API_PREFIXES = [
  "/api/v1/auth/me",
  "/api/v1/mixes",
  "/api/v1/playlists",
  "/api/v1/likes",
  "/api/v1/follows",
  "/api/v1/comments",
  "/api/v1/upload",
  "/api/v1/analytics",
  "/api/v1/admin",        // toutes les routes admin requièrent auth
  "/api/v1/notifications",
  // /api/v1/reports n'est pas ici car c'est un POST public
];

// Politique de sécurité du contenu : scripts et styles servis par le site uniquement
// ('unsafe-inline' requis par les scripts d'hydratation de Next ; 'unsafe-eval' seulement en dev
// pour le rechargement à chaud). Images, audios et uploads présignés peuvent venir d'un CDN https.
const IS_DEV = process.env.NODE_ENV !== "production";
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${IS_DEV ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https:${IS_DEV ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

// GET et HEAD sont toujours publics même si le préfixe est protégé (ex: liste des mixes)
const PUBLIC_API_METHODS_ONLY = new Set(["GET", "HEAD"]);

// ─── Proxy function ───────────────────────────────────────────────────────────

export async function proxy(request: NextRequest): Promise<NextResponse | Response> {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // ── 1. Page route protection ────────────────────────────────────────────────
  if (PROTECTED_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) {
    const token = request.cookies.get(COOKIE_NAME_ACCESS)?.value;
    const valid = token ? await isTokenValid(token) : false;

    if (!valid) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── 2. API route protection (non-GET endpoints) ─────────────────────────────
  if (
    PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p)) &&
    !PUBLIC_API_METHODS_ONLY.has(method)
  ) {
    const token = request.cookies.get(COOKIE_NAME_ACCESS)?.value;
    const valid = token ? await isTokenValid(token) : false;

    if (!valid) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  // ── 3. Security headers ─────────────────────────────────────────────────────
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  if (!IS_DEV) {
    // HTTPS obligatoire pendant 2 ans (actif seulement en production, derrière HTTPS)
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }

  return response;
}

// ─── Matcher ──────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    // Run on all routes except static assets and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|eot)).*)",
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function isTokenValid(token: string): Promise<boolean> {
  return (await verifyTypedToken(token, "access")) !== null;
}
