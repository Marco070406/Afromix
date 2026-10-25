import { api } from "./client";
import type { AnalyticsOverview } from "@/types/api";

export interface PlaysDataPoint { date: string; mixes: number; tracks: number; total: number; }
export interface TopContentItem { id: string; slug: string; title: string; coverUrl: string | null; audioUrl?: string | null; durationSec?: number | null; genre: string; playCount: number; likeCount: number; commentCount: number; publishedAt: string | null; type: "mix" | "track"; }
export interface AudienceData { byCountry: Array<{ country: string; plays: number; pct: number }>; byCity: Array<{ city: string; country: string; plays: number; pct: number }>; peakHours: Array<{ hour: number; plays: number }>; uniqueListeners: number; avgListenDurationMs: number; period: string; }

export const analyticsApi = {
  overview: (period: "7d" | "30d" | "90d" | "1y" = "30d") =>
    api.get<AnalyticsOverview>(`/analytics/overview?period=${period}`),

  plays: (period: "7d" | "30d" | "90d" | "1y" = "30d", granularity?: "day" | "week" | "month") => {
    const q = new URLSearchParams({ period });
    if (granularity) q.set("granularity", granularity);
    return api.get<{ series: PlaysDataPoint[]; period: string; granularity: string }>(`/analytics/plays?${q}`);
  },

  topContent: (sortBy: "playCount" | "likeCount" | "commentCount" = "playCount", limit = 10) =>
    api.get<{ mixes: TopContentItem[]; tracks: TopContentItem[] }>(
      `/analytics/top-content?sortBy=${sortBy}&limit=${limit}`
    ),

  audience: (period: "7d" | "30d" | "90d" | "1y" = "30d") =>
    api.get<AudienceData>(`/analytics/audience?period=${period}`),
};
