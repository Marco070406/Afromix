import { consumeEmailVerificationToken } from "@/services/auth/tokens";
import { ok, badRequest, serverError } from "@/lib/response";
import { NextResponse } from "next/server";

/**
 * GET /api/v1/auth/verify-email/[token]
 * Vérifie le token reçu par email et active le compte.
 * Si appelé par un navigateur (clic depuis l'email), redirige vers /login avec le statut.
 * Si appelé via API JSON, retourne la réponse JSON.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> {
  const { token } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const acceptsHtml = req.headers.get("accept")?.includes("text/html");

  if (!token) {
    if (acceptsHtml) {
      return NextResponse.redirect(`${appUrl}/login?error=missing_token`);
    }
    return badRequest("Token manquant");
  }

  try {
    const result = await consumeEmailVerificationToken(token);

    if (!result) {
      if (acceptsHtml) {
        return NextResponse.redirect(`${appUrl}/login?error=invalid_token`);
      }
      return badRequest("Lien invalide ou expiré");
    }

    if (acceptsHtml) {
      return NextResponse.redirect(`${appUrl}/login?verified=true`);
    }

    return ok({ message: "Email vérifié avec succès", userId: result.userId });
  } catch (err) {
    console.error("[GET /api/v1/auth/verify-email/[token]]", err);
    if (acceptsHtml) {
      return NextResponse.redirect(`${appUrl}/login?error=server_error`);
    }
    return serverError();
  }
}
