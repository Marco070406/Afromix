import { z } from "zod";

/**
 * URL http(s) uniquement. z.url() seul accepte n'importe quel protocole,
 * dont « javascript: », dangereux une fois affiché dans un lien.
 */
export const httpUrl = () => z.url({ protocol: /^https?$/, error: "URL http(s) invalide" });

// Fichier envoyé en local (développement sans R2) : clé produite par generateKey()
const LOCAL_IMAGE = /^\/uploads\/(avatars|banners|covers|events)\/\d{4}\/\d{2}\/[a-f0-9]{32}\.(jpg|jpeg|png|webp)$/;

// Mêmes domaines que images.remotePatterns dans next.config.ts : une autre adresse
// ferait planter l'affichage via next/image
function isAllowedImageHost(hostname: string): boolean {
  const cdn = process.env.STORAGE_CDN_URL;
  if (cdn && hostname === new URL(cdn).hostname) return true;
  return (
    hostname.endsWith(".r2.cloudflarestorage.com") ||
    hostname.endsWith(".public.blob.vercel-storage.com") ||
    hostname === "cdn.afromix.io" ||
    hostname === "images.unsplash.com"
  );
}

/** Image (photo de profil, bannière, affiche) hébergée par AfroMix. */
export const imageUrl = () =>
  z
    .string()
    .max(500)
    .refine((value) => {
      if (LOCAL_IMAGE.test(value)) return true;
      try {
        const url = new URL(value);
        return url.protocol === "https:" && isAllowedImageHost(url.hostname);
      } catch {
        return false;
      }
    }, "Image invalide : envoyez un fichier depuis AfroMix");
