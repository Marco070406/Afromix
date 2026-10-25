import { api } from "./client";

export interface MeResponse {
  id: string;
  email: string;
  role: "USER" | "ARTIST" | "ADMIN";
  emailVerified: boolean;
  profile: {
    displayName: string;
    avatarUrl: string | null;
    bio?: string | null;
    country?: string | null;
    city?: string | null;
    website?: string | null;
  } | null;
  artistProfile?: {
    id: string;
    slug: string;
    stageName: string;
    avatarUrl: string | null;
  } | null;
}

export interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string | null;
  bio?: string | null;
  country?: string | null;
  city?: string | null;
  website?: string | null;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  role: "USER" | "ARTIST";
}

export const authApi = {
  me: () => api.get<MeResponse>("/auth/me"),

  updateProfile: (input: UpdateProfileInput) =>
    api.patch<{ profile: NonNullable<MeResponse["profile"]> }>("/auth/me", input),

  login: (email: string, password: string) =>
    api.post<{ userId: string; email: string; role: string; emailVerified: boolean }>(
      "/auth/login",
      { email, password }
    ),

  register: (input: RegisterInput) =>
    api.post<{ userId: string; email: string; role: string; emailVerified: boolean }>(
      "/auth/register",
      input
    ),

  logout: () => api.post<{ message: string }>("/auth/logout"),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>("/auth/forgot-password", { email }),

  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>("/auth/reset-password", { token, password }),

  resendVerification: () =>
    api.post<{ message: string }>("/auth/verify-email"),
};
