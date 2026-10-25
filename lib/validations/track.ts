import { z } from "zod";
import { MixGenreEnum, ContentStatusEnum, TrackTypeEnum } from "./mix";
import { httpUrl } from "@/lib/validations/common";

export const createTrackSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  genre: MixGenreEnum.default("OTHER"),
  trackType: TrackTypeEnum.default("SINGLE"),
  tags: z.array(z.string().max(30)).max(10).default([]),
  albumId: z.string().optional(),
  bpm: z.number().int().min(1).max(300).optional(),
  key: z.string().max(10).optional(),
  lyrics: z.string().max(10000).optional(),
  audioKey: z.string().optional(),
  coverUrl: httpUrl().optional(),
  durationSec: z.number().int().positive().optional(),
});

export const updateTrackSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional(),
  genre: MixGenreEnum.optional(),           // pas de default en update
  trackType: TrackTypeEnum.optional(),      // pas de default en update
  tags: z.array(z.string().max(30)).max(10).optional(),
  albumId: z.string().optional(),
  bpm: z.number().int().min(1).max(300).optional(),
  key: z.string().max(10).optional(),
  lyrics: z.string().max(10000).optional(),
  audioKey: z.string().optional(),
  audioUrl: httpUrl().optional(),
  coverUrl: httpUrl().optional(),
  durationSec: z.number().int().positive().optional(),
  status: ContentStatusEnum.optional(),
});

export const trackQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  genre: MixGenreEnum.optional(),
  trackType: TrackTypeEnum.optional(),
  status: ContentStatusEnum.optional(),
  artistId: z.string().optional(),
  albumId: z.string().optional(),
  q: z.string().max(100).optional(),
  sortBy: z.enum(["publishedAt", "playCount", "likeCount"]).default("publishedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateTrackInput = z.infer<typeof createTrackSchema>;
export type UpdateTrackInput = z.infer<typeof updateTrackSchema>;
export type TrackQuery = z.infer<typeof trackQuerySchema>;
