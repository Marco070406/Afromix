import { api } from "./client";
import type { ArtistSummary, ArtistDetail, MixSummary } from "@/types/api";

export interface BookingInquiryData {
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  eventType: "CLUB" | "FESTIVAL" | "WEDDING" | "PRIVATE" | "CONCERT" | "OTHER";
  eventDate?: string;
  eventCity?: string;
  budget?: string;
  message: string;
}

/** Demande de booking reçue par l'artiste (GET /artists/me/inquiries) */
export interface BookingInquiry {
  id: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string | null;
  eventType: BookingInquiryData["eventType"];
  eventDate: string | null;
  eventCity: string | null;
  budget: string | null;
  message: string;
  status: "PENDING" | "READ" | "ACCEPTED" | "DECLINED";
  createdAt: string;
  sender: { profile: { avatarUrl: string | null } | null } | null;
}

export type ArtistProfileUpdate = Partial<{
  stageName: string;
  bio: string;
  country: string;
  city: string;
  website: string;
  instagram: string;
  soundcloud: string;
  twitter: string;
  youtube: string;
  tiktok: string;
  spotify: string;
  genres: string[];
  avatarUrl: string;
  bannerUrl: string;
  bookingEmail: string;
  bookingPhone: string;
  bookingNotes: string;
  availableForBooking: boolean;
}>;

export const artistsApi = {
  list: (params: {
    page?: number;
    pageSize?: number;
    q?: string;
    country?: string;
    genre?: string;
    verified?: boolean;
  } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) q.set(k, String(v)); });
    return api.get<ArtistSummary[]>(`/artists?${q}`);
  },

  getBySlug: (slug: string) => api.get<ArtistDetail>(`/artists/${slug}`),

  getMyProfile: () => api.get<ArtistDetail>("/artists/me"),

  updateMyProfile: (data: ArtistProfileUpdate) => api.patch<ArtistDetail>("/artists/me", data),

  getMixes: (slug: string, page = 1) =>
    api.get<MixSummary[]>(`/artists/${slug}/mixes?page=${page}&pageSize=20`),

  updateProfile: (slug: string, data: Partial<{
    stageName: string;
    bio: string;
    country: string;
    city: string;
    website: string;
    instagram: string;
    soundcloud: string;
    twitter: string;
    youtube: string;
    tiktok: string;
    spotify: string;
    genres: string[];
    avatarUrl: string;
    bannerUrl: string;
    bookingEmail: string;
    bookingPhone: string;
    bookingNotes: string;
    availableForBooking: boolean;
  }>) => api.patch<ArtistDetail>(`/artists/${slug}`, data),

  sendBookingInquiry: (slug: string, data: BookingInquiryData) =>
    api.post<{ id: string; message: string }>(`/artists/${slug}/contact`, data),

  getMyInquiries: () => api.get<BookingInquiry[]>("/artists/me/inquiries"),

  requestVerification: (slug: string) =>
    api.post<{ message: string }>(`/artists/${slug}/verify`),

  presignAvatar: (fileName: string, contentType: string) =>
    api.post<{ uploadUrl: string; key: string; cdnUrl: string }>("/upload/presign", {
      fileName,
      contentType,
      folder: "avatars",
    }),

  presignBanner: (fileName: string, contentType: string) =>
    api.post<{ uploadUrl: string; key: string; cdnUrl: string }>("/upload/presign", {
      fileName,
      contentType,
      folder: "banners",
    }),

  // Enregistre sur le profil une image déjà envoyée (clé renvoyée par presign)
  confirmAvatar: (slug: string, key: string) =>
    api.post<{ avatarUrl: string }>(`/artists/${slug}/avatar/confirm`, { key }),

  confirmBanner: (slug: string, key: string) =>
    api.post<{ bannerUrl: string }>(`/artists/${slug}/banner/confirm`, { key }),
};
