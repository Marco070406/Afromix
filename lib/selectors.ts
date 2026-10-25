/**
 * Sélecteurs Prisma réutilisés dans plusieurs services.
 * Centralise les champs retournés pour garantir la cohérence des types API.
 */

/** Champs de base d'un artiste — utilisé dans les listes, mixes, tracks, etc. */
export const artistSelect = {
  id: true,
  userId: true,    // requis pour toggleFollow côté frontend
  slug: true,
  stageName: true,
  avatarUrl: true,
  country: true,
  verified: true,
  followerCount: true,
  genres: true,
  availableForBooking: true,
} as const;

/** Champs complets d'un artiste — utilisé dans le détail artiste */
export const artistDetailSelect = {
  ...artistSelect,
  bannerUrl: true,
  bio: true,
  city: true,
  website: true,
  instagram: true,
  soundcloud: true,
  twitter: true,
  youtube: true,
  tiktok: true,
  spotify: true,
  verificationStatus: true,
  bookingEmail: true,
  bookingPhone: true,
  bookingNotes: true,
  availableForBooking: true,
} as const;
