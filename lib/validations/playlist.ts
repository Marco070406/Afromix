import { z } from "zod";
import { httpUrl } from "@/lib/validations/common";

export const createPlaylistSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(true),
  coverUrl: httpUrl().optional(),
});

export const updatePlaylistSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  coverUrl: httpUrl().optional().or(z.literal("")),
});

export const addPlaylistItemSchema = z
  .object({
    mixId: z.string().optional(),
    trackId: z.string().optional(),
    position: z.number().int().min(0).optional(), // auto-append si absent
  })
  .refine((data) => data.mixId ?? data.trackId, {
    message: "mixId ou trackId est requis",
  });

export const reorderItemsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),       // PlaylistItem.id
        position: z.number().int().min(0),
      })
    )
    .min(1),
});

export const playlistQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  userId: z.string().optional(),       // filtre par propriétaire
  isPublic: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;
export type UpdatePlaylistInput = z.infer<typeof updatePlaylistSchema>;
export type AddPlaylistItemInput = z.infer<typeof addPlaylistItemSchema>;
export type ReorderItemsInput = z.infer<typeof reorderItemsSchema>;
export type PlaylistQuery = z.infer<typeof playlistQuerySchema>;
