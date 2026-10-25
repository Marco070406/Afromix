import { createPresignedUploadUrl, generateKey } from "@/lib/storage";
import { getSession } from "@/lib/auth";
import { presignedUploadSchema } from "@/lib/validations/upload";
import { created, badRequest, unauthorized, serverError } from "@/lib/response";

// POST /api/v1/upload/presign
// Returns a presigned URL so the client can upload directly to R2/S3.
export async function POST(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

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
