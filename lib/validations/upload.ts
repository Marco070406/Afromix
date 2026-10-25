import { z } from "zod";
import { ALLOWED_AUDIO_TYPES, ALLOWED_IMAGE_TYPES } from "@/lib/storage";

export const presignedUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.enum([...ALLOWED_AUDIO_TYPES, ...ALLOWED_IMAGE_TYPES] as [string, ...string[]]),
  folder: z.enum(["mixes", "tracks", "covers", "avatars", "banners", "events"]),
});

export type PresignedUploadInput = z.infer<typeof presignedUploadSchema>;
