import { api } from "./client";

export const adminApi = {
  // Users
  listUsers: (params: { page?: number; q?: string; role?: string; suspended?: boolean } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) q.set(k, String(v)); });
    return api.get<Array<{
      id: string; email: string; role: string; suspended: boolean; emailVerified: boolean; createdAt: string;
      profile: { displayName: string; avatarUrl: string | null; country: string | null } | null;
      artistProfile: { slug: string; stageName: string; verified: boolean; verificationStatus: string } | null;
    }>>(`/admin/users?${q}`);
  },

  suspendUser: (id: string, reason?: string) =>
    api.post<{ message: string }>(`/admin/users/${id}/suspend`, { reason }),

  unsuspendUser: (id: string) =>
    api.post<{ message: string }>(`/admin/users/${id}/unsuspend`),

  // Reports
  listReports: (params: { page?: number; status?: string; targetType?: string } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) q.set(k, String(v)); });
    return api.get<Array<{
      id: string; targetType: string; targetId: string; reason: string;
      status: string; details: string | null; createdAt: string; resolvedAt: string | null;
      moderatorNote: string | null;
      reporter: { id: string; email: string; profile: { displayName: string } | null };
    }>>(`/admin/reports?${q}`);
  },

  processReport: (id: string, status: "REVIEWED" | "DISMISSED" | "ACTION_TAKEN", note?: string) =>
    api.patch<{ message: string }>(`/admin/reports/${id}`, { status, note }),

  // Artists
  verifyArtist: (slug: string, status: "VERIFIED" | "REJECTED", note?: string) =>
    api.post<{ message: string; status: string }>(`/admin/artists/${slug}/verify`, { status, note }),

  // Content moderation
  setContentStatus: (type: "mix" | "track" | "album", id: string, status: string, reason?: string) =>
    api.patch<{ message: string; status: string }>(`/admin/content/${type}/${id}`, { status, reason }),

  // Audit logs
  auditLogs: (page = 1, actorId?: string, action?: string) => {
    const q = new URLSearchParams({ page: String(page) });
    if (actorId) q.set("actorId", actorId);
    if (action) q.set("action", action);
    return api.get<Array<{
      id: string; action: string; targetType: string; targetId: string;
      details: unknown; ipAddress: string | null; createdAt: string;
      actor: { id: string; email: string; profile: { displayName: string } | null };
    }>>(`/admin/audit-logs?${q}`);
  },
};
