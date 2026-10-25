/**
 * API-level types — what the Route Handlers accept and return.
 * These are intentionally separate from Prisma model types to allow
 * field selection / transformation before sending to the client.
 */

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  profile: {
    displayName: string;
    avatarUrl: string | null;
  } | null;
  artistProfile?: {
    id: string;
    slug: string;
    stageName: string;
    avatarUrl: string | null;
  } | null;
}

// ─── Artists (DJ profiles) ───────────────────────────────────────────────────

export interface ArtistSummary {
  id: string;           // artistProfile.id
  userId: string;       // User.id — requis pour toggleFollow
  slug: string;
  stageName: string;
  avatarUrl: string | null;
  country: string | null;
  verified: boolean;
  followerCount: number;
  genres: string[];
  availableForBooking?: boolean;
  monthlyPlays?: number;
  topMix?: {
    id: string;
    slug: string;
    title: string;
    coverUrl: string | null;
    audioUrl: string | null;
    durationSec: number | null;
    playCount: number;
  } | null;
}

export interface ArtistDetail extends ArtistSummary {
  bannerUrl: string | null;
  bio: string | null;
  city: string | null;
  website: string | null;
  instagram: string | null;
  soundcloud: string | null;
  twitter: string | null;
  youtube: string | null;
  tiktok: string | null;
  spotify: string | null;
  verificationStatus: string;
  mixCount: number;
  trackCount: number;
  bookingEmail?: string | null;
  bookingPhone?: string | null;
  bookingNotes?: string | null;
  availableForBooking: boolean;
  isFollowing?: boolean;
}

// ─── Mixes ────────────────────────────────────────────────────────────────────

export interface MixSummary {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  audioUrl: string | null;
  durationSec: number | null;
  genre: string;
  mixType: string;
  playCount: number;
  likeCount: number;
  publishedAt: string | null;
  artist: ArtistSummary;
}

export interface MixDetail extends MixSummary {
  description: string | null;
  tags: string[];
  commentCount: number;
  tracklist: TracklistEntry[];
  isLiked?: boolean;
}

export interface TracklistEntry extends TrackSummary {
  position: number;
  startSec: number | null;
}

// ─── Tracks ───────────────────────────────────────────────────────────────────

export interface TrackSummary {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  audioUrl: string | null;
  durationSec: number | null;
  genre: string;
  trackType: string;
  bpm: number | null;
  key: string | null;
  playCount: number;
  likeCount: number;
  publishedAt: string | null;
  artist: ArtistSummary;
}

export interface TrackDetail extends TrackSummary {
  description: string | null;
  tags: string[];
  lyrics: string | null;
  commentCount: number;
  album: { id: string; slug: string; title: string; coverUrl: string | null } | null;
}

// ─── Albums ───────────────────────────────────────────────────────────────────

export interface AlbumSummary {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  genre: string;
  releaseDate: string | null;
  trackCount: number;
  likeCount: number;
  publishedAt: string | null;
  artist: ArtistSummary;
}

export interface AlbumDetail extends AlbumSummary {
  description: string | null;
  tags: string[];
  tracks: TrackSummary[];
}

// ─── Playlists ────────────────────────────────────────────────────────────────

export interface PlaylistSummary {
  id: string;
  title: string;
  coverUrl: string | null;
  isPublic: boolean;
  itemCount: number;
  owner: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export interface CommentDto {
  id: string;
  content: string;
  likeCount: number;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  replies?: CommentDto[];
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface PresignedUploadDto {
  uploadUrl: string;
  key: string;
  cdnUrl: string;
  expiresIn: number;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  totalPlays: number;
  totalLikes: number;
  totalComments: number;
  totalFollowers: number;
  totalMixes: number;
  totalTracks: number;
  playsGrowth: number | null;
  followersGrowth: number | null;
  // Legacy (rétrocompat)
  topMixes?: MixSummary[];
  playsByDay?: Array<{ date: string; count: number }>;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type EventStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface EventItem {
  id: string;
  artistId: string | null;
  createdById?: string | null;
  title: string;
  description: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  startAt: string;
  endAt: string | null;
  ticketUrl: string | null;
  coverUrl: string | null;
  status: EventStatus;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  artist?: {
    id: string;
    slug: string;
    stageName: string;
    avatarUrl: string | null;
    country: string | null;
    bio?: string | null;
  } | null;
  createdBy?: {
    id: string;
    email?: string;
    profile?: { displayName: string | null } | null;
  } | null;
}

