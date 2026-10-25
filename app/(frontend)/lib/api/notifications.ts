import { api } from "./client";

export interface Notification {
  id: string;
  type: "NEW_FOLLOWER" | "NEW_LIKE" | "NEW_COMMENT" | "NEW_MIX" | "NEW_TRACK" | "SYSTEM";
  title: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  read: boolean;
  createdAt: string;
}

export const notificationsApi = {
  list: (page = 1, unreadOnly = false) =>
    api.get<Notification[]>(`/notifications?page=${page}&pageSize=20&unreadOnly=${unreadOnly}`),

  unreadCount: () => api.get<{ count: number; hasMore: boolean }>("/notifications/unread-count"),

  markRead: (id: string) => api.patch<{ read: boolean }>(`/notifications/${id}`),

  markAllRead: () => api.patch<{ marked: number; message: string }>("/notifications/read-all"),

  delete: (id: string) => api.delete<void>(`/notifications/${id}`),
};
