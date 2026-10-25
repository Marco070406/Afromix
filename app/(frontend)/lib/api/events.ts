import { api } from "./client";
import type { EventItem } from "@/types/api";

export interface CreateEventInput {
  title: string;
  description?: string;
  venue?: string;
  city?: string;
  country?: string;
  startAt: string;
  endAt?: string;
  ticketUrl?: string;
  coverUrl?: string;
  artistId?: string;
}

export const eventsApi = {
  list: (params?: { status?: string }) => {
    const q = params?.status ? `?status=${params.status}` : "";
    return api.get<EventItem[]>(`/events${q}`);
  },
  getById: (id: string) => api.get<EventItem>(`/events/${id}`),
  create: (data: CreateEventInput) => api.post<EventItem>("/events", data),
  moderate: (id: string, data: { action: "APPROVE" } | { action: "REJECT"; reason: string }) =>
    api.patch<EventItem>(`/events/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/events/${id}`),
};
