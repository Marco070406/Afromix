import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Pictogrammes emoji, drapeaux, sélecteurs de variante et liants (ZWJ)
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{FE0F}\u{200D}]/gu;

/** Retire les emojis d'un texte (ex. notifications créées avant leur suppression) */
export function stripEmoji(text: string): string {
  return text.replace(EMOJI_RE, "").replace(/\s{2,}/g, " ").trim();
}

/** Formate les secondes en mm:ss ou hh:mm:ss */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "--:--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Formate un grand nombre : 1500 → 1.5k */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

/** Retourne le temps relatif : "il y a 2 jours" / "2d ago" */
export function timeAgo(dateStr: string | null | undefined, lang: "fr" | "en" = "fr"): string {
  if (!dateStr) return "";
  const fr = lang === "fr";
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return fr ? "à l'instant" : "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return fr ? `il y a ${minutes} min` : `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return fr ? `il y a ${hours}h` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return fr ? `il y a ${days}j` : `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return fr ? `il y a ${months} mois` : `${months} mo ago`;
  const years = Math.floor(months / 12);
  return fr ? `il y a ${years} an${years > 1 ? "s" : ""}` : `${years}y ago`;
}

/** Label lisible pour un genre */
export const GENRE_LABELS: Record<string, string> = {
  AFROBEATS: "Afrobeats",
  AMAPIANO: "Amapiano",
  AFRO_HOUSE: "Afro House",
  AFRO_SOUL: "Afro Soul",
  BONGO_FLAVA: "Bongo Flava",
  DANCEHALL: "Dancehall",
  HIGHLIFE: "Highlife",
  KIZOMBA: "Kizomba",
  KUDURO: "Kuduro",
  NDOMBOLO: "Ndombolo",
  RUMBA: "Rumba",
  SOCA: "Soca",
  OTHER: "Autre",
};

// Noms courts usuels, là où Intl.DisplayNames donne une forme longue
const COUNTRY_OVERRIDES: Record<string, { fr: string; en: string }> = {
  CD: { fr: "RD Congo", en: "DR Congo" },
  CG: { fr: "Congo", en: "Congo" },
};

/** Nom du pays (code ISO 3166-1 alpha-2) dans la langue demandée */
export function countryName(code: string, lang: "fr" | "en" = "fr"): string {
  if (!code) return "";
  const override = COUNTRY_OVERRIDES[code.toUpperCase()];
  if (override) return override[lang];
  try {
    return new Intl.DisplayNames([lang], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Libellé de genre dans la langue courante (seul « Autre » change) */
export function genreLabel(genre: string, lang: "fr" | "en" = "fr"): string {
  if (genre === "OTHER") return lang === "fr" ? "Autre" : "Other";
  return GENRE_LABELS[genre] ?? genre;
}

export const MIX_TYPE_LABELS: Record<string, string> = {
  DJ_MIX: "DJ Mix",
  DJ_SET: "DJ Set",
  LIVE_SET: "Live Set",
  PODCAST: "Podcast",
};

/** Villes africaines majeures pour le filtre géographique */
export const AFRICAN_CITIES: Array<{ city: string; country: string; countryCode: string }> = [
  { city: "Lagos", country: "Nigeria", countryCode: "NG" },
  { city: "Abidjan", country: "Côte d'Ivoire", countryCode: "CI" },
  { city: "Johannesburg", country: "South Africa", countryCode: "ZA" },
  { city: "Dakar", country: "Sénégal", countryCode: "SN" },
  { city: "Lomé", country: "Togo", countryCode: "TG" },
  { city: "Accra", country: "Ghana", countryCode: "GH" },
  { city: "Nairobi", country: "Kenya", countryCode: "KE" },
  { city: "Douala", country: "Cameroun", countryCode: "CM" },
  { city: "Kinshasa", country: "RD Congo", countryCode: "CD" },
  { city: "Cape Town", country: "South Africa", countryCode: "ZA" },
  { city: "Cotonou", country: "Bénin", countryCode: "BJ" },
  { city: "Ouagadougou", country: "Burkina Faso", countryCode: "BF" },
  { city: "Dar es Salaam", country: "Tanzania", countryCode: "TZ" },
  { city: "Luanda", country: "Angola", countryCode: "AO" },
  { city: "Maputo", country: "Mozambique", countryCode: "MZ" },
];

/** Sub-genres pour filtrage fin */
export const SUB_GENRES: Record<string, string[]> = {
  AFROBEATS: ["Afro Pop", "Afro Fusion", "Naija Beats", "Alte"],
  AMAPIANO: ["Deep Amapiano", "Vocal Amapiano", "Tech Amapiano", "Private School"],
  AFRO_HOUSE: ["Tribal House", "Deep Afro", "Gqom", "Afro Tech"],
  DANCEHALL: ["Afro Dancehall", "Caribbean Dancehall", "Reggaeton Afro"],
  KIZOMBA: ["Urban Kiz", "Tarraxinha", "Ghetto Zouk", "Semba"],
  NDOMBOLO: ["Ndombolo Classique", "New Gen Ndombolo"],
  RUMBA: ["Rumba Congolaise", "Modern Rumba"],
};
