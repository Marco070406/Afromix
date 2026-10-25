import { z } from "zod";
import { httpUrl } from "@/lib/validations/common";

// ─── Shared enums ─────────────────────────────────────────────────────────────

export const MixGenreEnum = z.enum([
  "AFROBEATS", "AMAPIANO", "AFRO_HOUSE", "AFRO_SOUL", "BONGO_FLAVA",
  "DANCEHALL", "HIGHLIFE", "KIZOMBA", "KUDURO", "NDOMBOLO",
  "RUMBA", "SOCA", "OTHER",
]);

export const ContentStatusEnum = z.enum([
  "DRAFT", "PROCESSING", "PUBLISHED", "UNLISTED", "REMOVED",
]);

export const MixTypeEnum = z.enum([
  "DJ_MIX", "DJ_SET", "LIVE_SET", "PODCAST",
]);

export const TrackTypeEnum = z.enum([
  "SINGLE", "EP", "ALBUM_TRACK", "INSTRUMENTAL", "REMIX", "FREESTYLE", "LIVE",
]);

// ─── Mix ──────────────────────────────────────────────────────────────────────

export const createMixSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  genre: MixGenreEnum.default("OTHER"),
  mixType: MixTypeEnum.default("DJ_MIX"),
  tags: z.array(z.string().max(30)).max(10).default([]),
  audioKey: z.string().optional(),
  coverUrl: httpUrl().optional(),
  durationSec: z.number().int().positive().optional(),
});

export const updateMixSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional(),
  genre: MixGenreEnum.optional(),           // pas de default en update
  mixType: MixTypeEnum.optional(),          // pas de default en update
  tags: z.array(z.string().max(30)).max(10).optional(),
  audioKey: z.string().optional(),
  audioUrl: httpUrl().optional(),
  coverUrl: httpUrl().optional(),
  durationSec: z.number().int().positive().optional(),
  status: ContentStatusEnum.optional(),
});

export const mixQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  genre: MixGenreEnum.optional(),
  mixType: MixTypeEnum.optional(),
  country: z.string().max(2).optional(),
  status: ContentStatusEnum.optional(),
  artistId: z.string().optional(),
  q: z.string().max(100).optional(),
  sortBy: z.enum(["publishedAt", "playCount", "likeCount"]).default("publishedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// ─── Tracklist ────────────────────────────────────────────────────────────────

export const addTracklistItemSchema = z.object({
  trackId: z.string().min(1).optional(),
  title: z.string().min(1).max(150).optional(),
  artistName: z.string().max(100).optional(),
  position: z.number().int().min(0),
  startSec: z.number().int().min(0).optional(),
}).refine((data) => !!(data.trackId || data.title), {
  message: "trackId ou title est requis",
});

export const reorderTracklistSchema = z.object({
  items: z.array(z.object({
    trackId: z.string().min(1),
    position: z.number().int().min(0),
    startSec: z.number().int().min(0).optional(),
  })).min(1),
});

// ─── Types inférés ────────────────────────────────────────────────────────────

export type CreateMixInput = z.infer<typeof createMixSchema>;
export type UpdateMixInput = z.infer<typeof updateMixSchema>;
export type MixQuery = z.infer<typeof mixQuerySchema>;
export type AddTracklistItemInput = z.infer<typeof addTracklistItemSchema>;
export type ReorderTracklistInput = z.infer<typeof reorderTracklistSchema>;
