"use client";

import { api, ApiError } from "@/app/(frontend)/lib/api/client";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // même limite que le serveur
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");

type Tr = (fr: string, en: string) => string;
type ImageFolder = "avatars" | "banners" | "events";

/** Message lisible à afficher dans un toast, en français ou en anglais. */
export function uploadErrorMessage(err: unknown, tr: Tr): string {
  if (err instanceof ApiError && err.status === 503) return err.message;
  if (err instanceof Error && err.message === "image-type") {
    return tr("Format JPEG, PNG ou WebP requis", "JPEG, PNG or WebP required");
  }
  if (err instanceof Error && err.message === "image-size") {
    return tr("Image trop lourde (10 Mo maximum)", "Image too large (10 MB max)");
  }
  return tr("L'envoi de l'image a échoué, réessayez.", "Image upload failed, please try again.");
}

/** Lève une erreur si le fichier n'est pas une image acceptée. */
export function checkImage(file: File): void {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("image-type");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("image-size");
}

/** PUT direct vers l'URL présignée (R2/S3 ou endpoint local), avec progression. */
export function putWithProgress(url: string, file: File, onProgress?: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress?.(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new ApiError(xhr.status, "Upload failed")));
    xhr.onerror = () => reject(new Error("network"));
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

/**
 * Envoie une image et retourne sa clé de stockage et son URL publique.
 * La clé sert aux routes « confirm » ; l'URL peut être enregistrée directement.
 */
export async function uploadImage(
  file: File,
  folder: ImageFolder,
  onProgress?: (percent: number) => void
): Promise<{ key: string; url: string }> {
  checkImage(file);
  const { data } = await api.post<{ uploadUrl: string; key: string; cdnUrl: string }>("/upload/presign", {
    fileName: file.name,
    contentType: file.type,
    folder,
  });
  await putWithProgress(data.uploadUrl, file, onProgress);
  return { key: data.key, url: data.cdnUrl };
}
