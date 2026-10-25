import { api } from "./client";

export interface PlaylistItem {
  id: string;
  position: number;
  addedAt: string;
  mix: { id: string; slug: string; title: string; coverUrl: string | null; audioUrl: string | null; genre: string; mixType: string; durationSec: number | null; playCount: number; likeCount: number; artist: { id: string; slug: string; stageName: string; avatarUrl: string | null } } | null;
  track: { id: string; slug: string; title: string; coverUrl: string | null; audioUrl: string | null; genre: string; durationSec: number | null; playCount: number; likeCount: number; artist: { id: string; slug: string; stageName: string; avatarUrl: string | null } } | null;
}

export interface PlaylistDetail {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; displayName: string | null; avatarUrl: string | null };
  items: PlaylistItem[];
}

export interface PlaylistSummary {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  itemCount: number;
  createdAt: string;
  owner: { id: string; displayName: string | null; avatarUrl: string | null };
}

export const playlistsApi = {
  list: (params: { userId?: string; page?: number; pageSize?: number; isPublic?: boolean } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) q.set(k, String(v)); });
    return api.get<PlaylistSummary[]>(`/playlists?${q}`);
  },

  get: (id: string) => api.get<PlaylistDetail>(`/playlists/${id}`),

  create: (data: { title: string; description?: string; isPublic: boolean; coverUrl?: string }) =>
    api.post<PlaylistSummary>("/playlists", data),

  update: (id: string, data: Partial<{ title: string; description: string; isPublic: boolean; coverUrl: string }>) =>
    api.patch<PlaylistSummary>(`/playlists/${id}`, data),

  delete: (id: string) => api.delete<void>(`/playlists/${id}`),

  addItem: (id: string, data: { mixId?: string; trackId?: string; position?: number }) =>
    api.post<PlaylistItem>(`/playlists/${id}/items`, data),

  removeItem: (id: string, itemId: string) =>
    api.delete<{ message: string }>(`/playlists/${id}/items?itemId=${itemId}`),

  reorder: (id: string, items: Array<{ id: string; position: number }>) =>
    api.patch<{ message: string }>(`/playlists/${id}/items/reorder`, { items }),
};
