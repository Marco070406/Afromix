/**
 * Utilitaires pour extraire des informations de la requête HTTP.
 * Utilisable dans les Route Handlers (contexte request).
 */

/**
 * Extrait l'IP du client depuis les headers de la requête.
 * Priorité : CF-Connecting-IP > X-Forwarded-For > X-Real-IP
 */
export function getClientIp(request: Request): string | null {
  const headers = request.headers;
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    null
  );
}
