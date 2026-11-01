import { limitOrNull } from "@/lib/redis";
import { createPresignedUploadUrl, generateKey, isAudioType, storageUnavailable } from "@/lib/storage";
import { getSession } from "@/lib/auth";
import { presignedUploadSchema } from "@/lib/validations/upload";
import { created, badRequest, forbidden, unauthorized, serverError } from "@/lib/response";

// POST /api/v1/upload/presign
// Returns a presigned URL so the client can upload directly to R2/S3.
export async function POST(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  const unavailable = storageUnavailable() ?? (await limitOrNull("upload", session.sub, 60, 600));
  if (unavailable) return unavailable;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = presignedUploadSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  const { contentType, folder } = parsed.data;

  // Seule la photo de profil est ouverte à tous : le stockage a un quota, et mixes,
  // morceaux, pochettes, bannières et affiches sont réservés aux créateurs.
  if (folder !== "avatars" && session.role !== "ARTIST" && session.role !== "ADMIN") {
    return forbidden("Réservé aux comptes DJ");
  }
  // Pas d'audio dans un dossier d'images, ni l'inverse
  const audioFolder = folder === "mixes" || folder === "tracks";
  if (audioFolder !== isAudioType(contentType)) {
    return badRequest("Type de fichier incompatible avec ce dossier");
  }

  try {
    // Extension dérivée du type MIME validé, pas du nom fourni par le client
    const key = generateKey(folder, contentType, true);
    const result = await createPresignedUploadUrl(key, contentType);
    return created(result);
  } catch (err) {
    console.error("[POST /api/v1/upload/presign]", err);
    return serverError();
  }
}
