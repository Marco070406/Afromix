import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { unauthorized, badRequest, notFound, serverError } from "@/lib/response";
import {
  isRemoteStorageConfigured,
  MAX_AUDIO_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
} from "@/lib/storage";
import fs from "fs/promises";
import path from "path";

// Clé produite par generateKey() : <dossier>/<année>/<mois>/<32 hex>.<extension autorisée>
const KEY_PATTERN =
  /^(avatars|banners|covers|mixes|tracks|events)\/\d{4}\/\d{2}\/[a-f0-9]{32}\.(mp3|wav|aiff|flac|ogg|jpg|jpeg|png|webp)$/;
const AUDIO_EXT = new Set(["mp3", "wav", "aiff", "flac", "ogg"]);

/**
 * PUT /api/v1/upload/local?key=<key>
 * Endpoint local pour le développement : permet d'uploader directement
 * les bannières, avatars, covers et audios sur le système de fichiers local
 * sans nécessiter de configuration AWS S3 / Cloudflare R2.
 *
 * Sécurité : la clé doit avoir le format exact généré par le serveur (pas de
 * chemin libre ni d'extension arbitraire comme .html), le type du contenu doit
 * correspondre à l'extension, et la taille est plafonnée.
 */
export async function PUT(request: NextRequest): Promise<Response> {
  // Avec un stockage distant configuré, les uploads passent par les URL présignées
  if (isRemoteStorageConfigured()) return notFound();

  const session = await getSession();
  if (!session) return unauthorized();

  const key = request.nextUrl.searchParams.get("key") ?? "";
  const match = KEY_PATTERN.exec(key);
  if (!match) return badRequest("Invalid key");

  const isAudio = AUDIO_EXT.has(match[2]);
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith(isAudio ? "audio/" : "image/")) {
    return badRequest("Content-Type does not match the file type");
  }

  const maxBytes = isAudio ? MAX_AUDIO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return badRequest("File too large");

  try {
    const buffer = Buffer.from(await request.arrayBuffer());
    if (buffer.byteLength > maxBytes) return badRequest("File too large");

    const filePath = path.join(process.cwd(), "public", "uploads", ...key.split("/"));
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    // « wx » : n'écrase jamais un fichier existant (clé aléatoire, unique)
    await fs.writeFile(filePath, buffer, { flag: "wx" });

    return new Response(null, { status: 200 });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return badRequest("Key already used");
    console.error("[PUT /api/v1/upload/local]", err);
    return serverError();
  }
}
