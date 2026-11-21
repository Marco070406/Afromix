/** Horodatage « 1:02:05 » ou « 12:30 », y compris « 0:00 » (formatDuration affiche « --:-- » pour 0). */
export function timestamp(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Plafond de sécurité : aucun mix ne dépasse 24 h. */
const MAX_SECONDS = 24 * 3600;

/**
 * Lit un instant saisi ou reçu dans une adresse : « 750 », « 12:30 », « 1:02:05 » ou « 12m30s ».
 * Retourne des secondes entières, ou null si la valeur est invalide.
 */
export function parseTimeParam(raw: string | null | undefined): number | null {
  const value = raw?.trim().toLowerCase();
  if (!value) return null;

  let seconds: number | null = null;
  if (/^\d+$/.test(value)) {
    seconds = Number(value);
  } else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(value)) {
    const parts = value.split(":").map(Number);
    if (parts.slice(1).some((p) => p > 59)) return null;
    seconds = parts.reduce((total, p) => total * 60 + p, 0);
  } else {
    const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
    if (match && (match[1] || match[2] || match[3])) {
      seconds = Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
    }
  }
  return seconds !== null && Number.isFinite(seconds) && seconds <= MAX_SECONDS ? seconds : null;
}

/** Adresse absolue d'un mix, avec l'instant de départ s'il est donné. */
export function mixShareUrl(origin: string, slug: string, startSec?: number | null): string {
  const url = `${origin}/mixes/${encodeURIComponent(slug)}`;
  return startSec && startSec > 0 ? `${url}?t=${Math.floor(startSec)}` : url;
}
