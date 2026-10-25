import { api } from "./client";
import type { MixSummary, TrackSummary } from "@/types/api";

export const socialApi = {
  // Likes
  toggleLike: (targetType: "MIX" | "TRACK", targetId: string) =>
    api.post<{ liked: boolean }>("/likes", { targetType, targetId }),

  deleteLike: (id: string) => api.delete<void>(`/likes/${id}`),

  getUserLikes: (userId: string, type: "MIX" | "TRACK" | "all" = "all", page = 1) =>
    api.get<Array<{
      id: string;
      targetType: string;
      createdAt: string;
      mix: MixSummary | null;
      track: TrackSummary | null;
    }>>(`/users/${userId}/likes?type=${type}&page=${page}&pageSize=20`),

  // Follows
  toggleFollow: (artistUserId: string) =>
    api.post<{ following: boolean }>("/follows", { artistUserId }),

  deleteFollow: (id: string) => api.delete<void>(`/follows/${id}`),

  getUserFollows: (userId: string, direction: "following" | "followers" = "following", page = 1) =>
    api.get<Array<{
      id: string;
      createdAt: string;
      user: {
        id: string;
        displayName: string | null;
        avatarUrl: string | null;
        artistProfile: { id: string; slug: string; stageName: string; avatarUrl: string | null; verified: boolean } | null;
      };
    }>>(`/users/${userId}/follows?direction=${direction}&page=${page}&pageSize=20`),

  // Comments
  deleteComment: (id: string) => api.delete<void>(`/comments/${id}`),
  updateComment: (id: string, content: string) => api.patch<{ id: string; content: string }>(`/comments/${id}`, { content }),
  likeComment: (id: string) => api.post<{ likeCount: number }>(`/comments/${id}/like`),

  // Reports
  report: (targetType: string, targetId: string, reason: string, details?: string) =>
    api.post<{ id: string; message: string }>("/reports", { targetType, targetId, reason, details }),
};
