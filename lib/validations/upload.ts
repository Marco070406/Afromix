import { z } from "zod";
import { ALLOWED_AUDIO_TYPES, ALLOWED_IMAGE_TYPES, SAFE_EXTENSIONS, type StorageFolder } from "@/lib/storage";

export const presignedUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.enum([...ALLOWED_AUDIO_TYPES, ...ALLOWED_IMAGE_TYPES] as [string, ...string[]]),
  folder: z.enum(["mixes", "tracks", "covers", "avatars", "banners", "events"]),
});

/** Clé exacte produite par generateKey() : ni chemin libre, ni fichier d'un autre dossier. */
export const storageKey = (folder: StorageFolder) =>
  z.string().regex(
    new RegExp(`^${folder}/\\d{4}/\\d{2}/[a-f0-9]{32}\\.(${SAFE_EXTENSIONS.join("|")})$`),
    "Clé de fichier invalide"
  );

export type PresignedUploadInput = z.infer<typeof presignedUploadSchema>;
