import { z } from "zod";
import { httpUrl } from "@/lib/validations/common";

// ─── Profil utilisateur basique ───────────────────────────────────────────────

export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  country: z.string().max(2).optional(), // ISO 3166-1 alpha-2
  city: z.string().max(100).optional(),
  website: httpUrl().optional().or(z.literal("")),
});

// ─── Profil artiste / DJ ──────────────────────────────────────────────────────

export const updateArtistProfileSchema = z.object({
  stageName: z.string().min(1).max(80).optional(),
  bio: z.string().max(2000).optional(),
  country: z.string().max(2).optional(),
  city: z.string().max(100).optional(),
  website: httpUrl().optional().or(z.literal("")),
  // Réseaux sociaux — handle ou URL complet accepté
  instagram: z.string().max(100).optional().or(z.literal("")),
  soundcloud: z.string().max(100).optional().or(z.literal("")),
  twitter: z.string().max(100).optional().or(z.literal("")),
  youtube: z.string().max(100).optional().or(z.literal("")),
  tiktok: z.string().max(100).optional().or(z.literal("")),
  spotify: z.string().max(100).optional().or(z.literal("")),
  // Contact & Booking
  bookingEmail: z.string().email("Email de booking invalide").optional().or(z.literal("")),
  bookingPhone: z.string().max(40).optional().or(z.literal("")),
  bookingNotes: z.string().max(1500).optional().or(z.literal("")),
  availableForBooking: z.boolean().optional(),
  // Genres musicaux (max 6)
  genres: z
    .array(z.string().min(1).max(30))
    .max(6, "Maximum 6 genres")
    .optional(),
  // URLs media (posées après upload direct R2)
  avatarUrl: httpUrl().optional().or(z.literal("")),
  bannerUrl: httpUrl().optional().or(z.literal("")),
});

// ─── Demande de Contact / Booking ─────────────────────────────────────────────

export const createBookingInquirySchema = z.object({
  senderName: z.string().min(2, "Le nom est requis").max(100),
  senderEmail: z.string().email("Email invalide"),
  senderPhone: z.string().max(30).optional().or(z.literal("")),
  eventType: z.enum(["CLUB", "FESTIVAL", "WEDDING", "PRIVATE", "CONCERT", "OTHER"]),
  eventDate: z.string().optional().or(z.literal("")),
  eventCity: z.string().max(100).optional().or(z.literal("")),
  budget: z.string().max(100).optional().or(z.literal("")),
  message: z.string().min(10, "Le message doit comporter au moins 10 caractères").max(2000),
});

// ─── Demande de vérification ──────────────────────────────────────────────────

export const requestVerificationSchema = z.object({
  message: z
    .string()
    .min(20, "Décris ton activité en au moins 20 caractères")
    .max(1000)
    .optional(),
});

// ─── Query params ─────────────────────────────────────────────────────────────

export const artistQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().max(100).optional(),
  country: z.string().max(2).optional(),
  genre: z.string().max(30).optional(),
  verified: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().max(100).optional(),
});

// ─── Types inférés ────────────────────────────────────────────────────────────

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateArtistProfileInput = z.infer<typeof updateArtistProfileSchema>;
export type CreateBookingInquiryInput = z.infer<typeof createBookingInquirySchema>;
export type RequestVerificationInput = z.infer<typeof requestVerificationSchema>;
export type ArtistQuery = z.infer<typeof artistQuerySchema>;
