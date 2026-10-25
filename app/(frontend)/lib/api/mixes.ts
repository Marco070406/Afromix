import { api } from "./client";
import type { MixSummary, MixDetail, CommentDto } from "@/types/api";

export interface MixQuery {
  page?: number;
  pageSize?: number;
  genre?: string;
  mixType?: string;
  country?: string;
  city?: string;
  status?: string;
  artistId?: string;
  q?: string;
  sortBy?: "publishedAt" | "playCount" | "likeCount";
  order?: "asc" | "desc";
}

export const mixesApi = {
  list: (params: MixQuery = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) q.set(k, String(v)); });
    return api.get<MixSummary[]>(`/mixes?${q}`);
  },

  getBySlug: (slug: string) => api.get<MixDetail>(`/mixes/${slug}`),

  create: (data: {
    title: string;
    description?: string;
    genre: string;
    mixType: string;
    tags: string[];
    audioKey?: string;
    coverUrl?: string;
    durationSec?: number;
  }) => api.post<MixDetail>("/mixes", data),

  update: (id: string, data: Partial<{
    title: string;
    description: string;
    genre: string;
    mixType: string;
    tags: string[];
    status: string;
    coverUrl: string;
    audioKey: string;
    audioUrl: string;
    durationSec: number;
  }>) => api.patch<MixDetail>(`/mixes/${id}`, data),

  delete: (id: string) => api.delete<void>(`/mixes/${id}`),

  recordPlay: (id: string) => api.post<{ played: boolean }>(`/mixes/${id}/play`),

  // Audio upload
  presignAudio: (id: string, contentType: string) =>
    api.post<{ uploadUrl: string; key: string; cdnUrl: string; expiresIn: number; maxBytes: number }>(
      `/mixes/${id}/audio`,
      { contentType }
    ),

  confirmAudio: (id: string, key: string, durationSec?: number) =>
    api.post<{ audioUrl: string; status: string }>(`/mixes/${id}/audio/confirm`, { key, durationSec }),

  // Cover upload
  presignCover: (id: string, contentType: string) =>
    api.post<{ uploadUrl: string; key: string; cdnUrl: string }>(`/mixes/${id}/cover`, { contentType }),

  confirmCover: (id: string, key: string) =>
    api.post<{ coverUrl: string }>(`/mixes/${id}/cover/confirm`, { key }),

  // Comments
  getComments: (id: string, page = 1) =>
    api.get<CommentDto[]>(`/mixes/${id}/comments?page=${page}&pageSize=20`),

  addComment: (id: string, content: string, parentId?: string) =>
    api.post<CommentDto>(`/mixes/${id}/comments`, { content, parentId }),

  // Tracklist
  getTracklist: (id: string) =>
    api.get<
      Array<{
        id: string;
        trackId: string;
        title: string;
        artistName: string;
        position: number;
        startSec?: number;
      }>
    >(`/mixes/${id}/tracklist`),

  addToTracklist: (
    id: string,
    data: {
      trackId?: string;
      title?: string;
      artistName?: string;
      position: number;
      startSec?: number;
    }
  ) => api.post<{ message: string; trackId: string }>(`/mixes/${id}/tracklist`, data),

  removeFromTracklist: (id: string, itemId: string) =>
    api.delete<{ message: string }>(`/mixes/${id}/tracklist?itemId=${itemId}`),
};
