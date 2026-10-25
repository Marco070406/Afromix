import { z } from "zod";
import { MixGenreEnum, ContentStatusEnum } from "./mix";
import { httpUrl } from "@/lib/validations/common";

export const createAlbumSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  genre: MixGenreEnum.default("OTHER"),
  tags: z.array(z.string().max(30)).max(10).default([]),
  releaseDate: z.string().datetime().optional(),
  coverUrl: httpUrl().optional(),
});

export const updateAlbumSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional(),
  genre: MixGenreEnum.optional(),           // pas de default en update
  tags: z.array(z.string().max(30)).max(10).optional(),
  releaseDate: z.string().datetime().optional(),
  coverUrl: httpUrl().optional(),
  status: ContentStatusEnum.optional(),
});

export const albumQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  genre: MixGenreEnum.optional(),
  status: ContentStatusEnum.optional(),
  artistId: z.string().optional(),
  q: z.string().max(100).optional(),
  sortBy: z.enum(["releaseDate", "publishedAt", "createdAt"]).default("releaseDate"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateAlbumInput = z.infer<typeof createAlbumSchema>;
export type UpdateAlbumInput = z.infer<typeof updateAlbumSchema>;
export type AlbumQuery = z.infer<typeof albumQuerySchema>;
