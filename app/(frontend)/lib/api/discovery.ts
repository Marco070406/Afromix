import { api } from "./client";
import type { MixSummary, TrackSummary, ArtistSummary } from "@/types/api";

export const discoveryApi = {
  trending: (params: { period?: "24h" | "7d" | "30d"; genre?: string; type?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) q.set(k, String(v)); });
    return api.get<{ mixes: MixSummary[]; tracks: TrackSummary[]; artists: ArtistSummary[]; period: string; genre: string | null }>(`/trending?${q}`);
  },

  genres: () =>
    api.get<Array<{ id: string; label: string; mixCount: number; trackCount: number; total: number }>>("/genres"),

  search: (params: {
    q: string;
    type?: "all" | "mixes" | "tracks" | "artists" | "albums";
    genre?: string;
    subGenre?: string;
    country?: string;
    city?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) q.set(k, String(v)); });
    return api.get<{
      mixes: MixSummary[];
      tracks: TrackSummary[];
      artists: ArtistSummary[];
      albums: unknown[];
      meta: { q: string; type: string; page: number; pageSize: number };
    }>(`/search?${q}`);
  },

  newReleases: (params: { days?: number; type?: string; genre?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) q.set(k, String(v)); });
    return api.get<{ mixes: MixSummary[]; tracks: TrackSummary[]; albums: unknown[] }>(`/new-releases?${q}`);
  },

  popular: (params: { type?: string; genre?: string; sortBy?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) q.set(k, String(v)); });
    return api.get<{ mixes: MixSummary[]; tracks: TrackSummary[]; artists: ArtistSummary[] }>(`/popular?${q}`);
  },

  forYou: (limit = 20) =>
    api.get<{
      mixes: MixSummary[];
      tracks: TrackSummary[];
      artists: ArtistSummary[];
      reason: { basedOnFollows: boolean; basedOnListens: boolean; topGenres: string[] };
    }>(`/recommendations/for-you?limit=${limit}`),

  trendingNearMe: (country?: string) =>
    api.get<{ mixes: MixSummary[]; country: string | null; fallback: boolean }>(
      `/recommendations/trending-near-me${country ? `?country=${country}` : ""}`
    ),

  similarMixes: (slug: string, limit = 10) =>
    api.get<MixSummary[]>(`/recommendations/similar-mixes/${slug}?limit=${limit}`),

  similarArtists: (slug: string, limit = 10) =>
    api.get<ArtistSummary[]>(`/recommendations/similar-artists/${slug}?limit=${limit}`),
};
