import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

// ─── Client ───────────────────────────────────────────────────────────────────
// Compatible AWS S3 et Cloudflare R2 (même API S3).
// STORAGE_ENDPOINT = https://<accountId>.r2.cloudflarestorage.com pour R2

function createS3Client() {
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID ?? "";
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY ?? "";

  if (!accessKeyId || !secretAccessKey) {
    // En développement sans R2, le client est créé mais les appels échoueront.
    // Les routes presign retournent une erreur explicite dans ce cas.
    if (process.env.NODE_ENV === "development") {
      console.warn("[Storage] STORAGE_ACCESS_KEY_ID / STORAGE_SECRET_ACCESS_KEY non définis — upload désactivé.");
    }
  }

  return new S3Client({
    region: process.env.STORAGE_REGION ?? "auto",
    endpoint: process.env.STORAGE_ENDPOINT,   // undefined = AWS S3 standard
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: !!process.env.STORAGE_ENDPOINT, // requis pour R2
  });
}

const s3 = createS3Client();
const BUCKET = process.env.STORAGE_BUCKET ?? "afromix";
const CDN_BASE = process.env.STORAGE_CDN_URL ?? "";

// ─── Storage disponible ? ─────────────────────────────────────────────────────

export function isS3Configured(): boolean {
  return !!(
    process.env.STORAGE_ACCESS_KEY_ID &&
    process.env.STORAGE_SECRET_ACCESS_KEY &&
    process.env.STORAGE_BUCKET
  );
}

export function isStorageConfigured(): boolean {
  // Toujours true car en développement local sans S3, les fichiers sont sauvegardés dans public/uploads/
  return true;
}

// ─── Dossiers ─────────────────────────────────────────────────────────────────

export type StorageFolder =
  | "mixes"
  | "tracks"
  | "covers"
  | "avatars"
  | "banners"
  | "events";

// ─── Limites ──────────────────────────────────────────────────────────────────

export const MAX_AUDIO_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;  // 10 MB

// TTL presigned URL : plus long pour audio (upload peut être lent)
export const PRESIGN_TTL_AUDIO = 60 * 60;  // 1 heure
export const PRESIGN_TTL_IMAGE = 60 * 15;  // 15 minutes

// ─── MIME types autorisés ─────────────────────────────────────────────────────

export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/aiff",
  "audio/x-aiff",
  "audio/flac",
  "audio/ogg",
] as const;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedAudioType = (typeof ALLOWED_AUDIO_TYPES)[number];
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export function isAudioType(ct: string): ct is AllowedAudioType {
  return (ALLOWED_AUDIO_TYPES as readonly string[]).includes(ct);
}

export function isImageType(ct: string): ct is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(ct);
}

// Extension canonique à partir du MIME type
export function extFromMime(contentType: string): string {
  const map: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/aiff": "aiff",
    "audio/x-aiff": "aiff",
    "audio/flac": "flac",
    "audio/ogg": "ogg",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[contentType] ?? "bin";
}

/** Extensions acceptées en stockage : jamais .html/.svg/.js, qui seraient servis tels quels. */
export const SAFE_EXTENSIONS = ["mp3", "wav", "aiff", "flac", "ogg", "jpg", "jpeg", "png", "webp"] as const;

// ─── Génération de clé ────────────────────────────────────────────────────────

/**
 * Génère une clé S3/R2 unique et non-devinable.
 * Format : <folder>/<year>/<month>/<16hexbytes>.<ext>
 * Ex : mixes/2026/09/3f8a1c2d4e5b6a7f.mp3
 */
export function generateKey(
  folder: StorageFolder,
  originalNameOrMime: string,
  useMimeForExt = false
): string {
  const fromName = originalNameOrMime.split(".").pop()?.toLowerCase() ?? "";
  // L'extension vient du type MIME, ou d'une liste fermée : un nom « x.html » donne « .bin »
  const ext = useMimeForExt
    ? extFromMime(originalNameOrMime)
    : (SAFE_EXTENSIONS as readonly string[]).includes(fromName) ? fromName : "bin";
  const id = crypto.randomBytes(16).toString("hex");
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${folder}/${year}/${month}/${id}.${ext}`;
}

/**
 * Retourne l'URL CDN publique pour une clé stockée.
 */
export function cdnUrl(key: string): string {
  if (isS3Configured()) {
    // Sans URL publique, le fichier serait bien sur R2/S3 mais enregistré avec une adresse
    // /uploads/… inexistante : mieux vaut échouer clairement.
    if (!CDN_BASE) throw new Error("STORAGE_CDN_URL manquant : URL publique du bucket requise.");
    return `${CDN_BASE.replace(/\/$/, "")}/${key}`;
  }
  return `/uploads/${key}`;
}

// ─── Upload direct (serveur) ──────────────────────────────────────────────────

export interface UploadOptions {
  contentType: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
}

/**
 * Upload un Buffer directement depuis le serveur.
 * Réservé aux petits fichiers (thumbnails, etc.).
 * Pour l'audio, utiliser createPresignedUploadUrl.
 */
export async function uploadObject(
  key: string,
  body: Buffer | Uint8Array,
  options: UploadOptions
): Promise<void> {
  if (!isS3Configured()) {
    const cleanKey = path.normalize(key).replace(/^(\.\.[\/\\])+/, "");
    const filePath = path.join(process.cwd(), "public", "uploads", cleanKey);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, body);
    return;
  }
  const input: PutObjectCommandInput = {
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: options.contentType,
    CacheControl: options.cacheControl ?? "public, max-age=31536000, immutable",
    Metadata: options.metadata,
  };
  await s3.send(new PutObjectCommand(input));
}

// ─── URL presignée ────────────────────────────────────────────────────────────

export interface PresignedUploadResult {
  uploadUrl: string;  // PUT vers cette URL depuis le client
  key: string;        // à renvoyer au serveur après upload pour confirm
  cdnUrl: string;     // URL publique finale (disponible après upload)
  expiresIn: number;  // secondes
  maxBytes: number;   // limite indicative à afficher côté client
}

/**
 * Génère une URL presignée pour upload direct client → R2/S3.
 *
 * Flux :
 *  1. Client POST /api/v1/mixes/[id]/audio  → reçoit { uploadUrl, key }
 *  2. Client PUT <uploadUrl> avec le fichier audio (header Content-Type obligatoire)
 *  3. Client POST /api/v1/mixes/[id]/audio/confirm { key } → persiste audioUrl
 */
export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = PRESIGN_TTL_IMAGE
): Promise<PresignedUploadResult> {
  const isAudio = isAudioType(contentType);
  const ttl = isAudio ? PRESIGN_TTL_AUDIO : expiresIn;
  const maxBytes = isAudio ? MAX_AUDIO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;

  if (!isS3Configured()) {
    // Mode développement local : upload direct vers l'endpoint local
    const uploadUrl = `/api/v1/upload/local?key=${encodeURIComponent(key)}`;
    return { uploadUrl, key, cdnUrl: cdnUrl(key), expiresIn: ttl, maxBytes };
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: ttl });

  return { uploadUrl, key, cdnUrl: cdnUrl(key), expiresIn: ttl, maxBytes };
}

// ─── Suppression ──────────────────────────────────────────────────────────────

/**
 * Supprime un objet du stockage.
 * Ne lève pas d'erreur si l'objet n'existe pas.
 */
export async function deleteObject(key: string): Promise<void> {
  if (!isS3Configured()) {
    try {
      const cleanKey = path.normalize(key).replace(/^(\.\.[\/\\])+/, "");
      const filePath = path.join(process.cwd(), "public", "uploads", cleanKey);
      await fs.unlink(filePath);
    } catch {
      // Ignore si le fichier n'existe pas
    }
    return;
  }
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    // Ignore les erreurs "not found"
  }
}

// ─── Vérification d'existence ─────────────────────────────────────────────────

export async function objectExists(key: string): Promise<boolean> {
  if (!isS3Configured()) {
    try {
      const cleanKey = path.normalize(key).replace(/^(\.\.[\/\\])+/, "");
      const filePath = path.join(process.cwd(), "public", "uploads", cleanKey);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}
