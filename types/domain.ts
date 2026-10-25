/**
 * Domain-level enums mirroring the Prisma schema.
 * Import these in business logic instead of relying on Prisma's generated enums
 * so they remain accessible in Edge-compatible contexts (proxy.ts, etc.).
 */

export const Role = {
  USER: "USER",
  ARTIST: "ARTIST",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const MixGenre = {
  AFROBEATS: "AFROBEATS",
  AMAPIANO: "AMAPIANO",
  AFRO_HOUSE: "AFRO_HOUSE",
  AFRO_SOUL: "AFRO_SOUL",
  BONGO_FLAVA: "BONGO_FLAVA",
  DANCEHALL: "DANCEHALL",
  HIGHLIFE: "HIGHLIFE",
  KIZOMBA: "KIZOMBA",
  KUDURO: "KUDURO",
  NDOMBOLO: "NDOMBOLO",
  RUMBA: "RUMBA",
  SOCA: "SOCA",
  OTHER: "OTHER",
} as const;
export type MixGenre = (typeof MixGenre)[keyof typeof MixGenre];

export const ContentStatus = {
  DRAFT: "DRAFT",
  PROCESSING: "PROCESSING",
  PUBLISHED: "PUBLISHED",
  UNLISTED: "UNLISTED",
  REMOVED: "REMOVED",
} as const;
export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];

export const SubscriptionTier = {
  FREE: "FREE",
  PRO: "PRO",
  LABEL: "LABEL",
} as const;
export type SubscriptionTier = (typeof SubscriptionTier)[keyof typeof SubscriptionTier];
