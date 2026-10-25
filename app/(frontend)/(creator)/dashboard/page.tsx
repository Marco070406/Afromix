"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, TrendingUp, Heart, Users, Music2, Disc3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { RequireAuth } from "@/app/(frontend)/components/auth/require-auth";
import { analyticsApi } from "@/app/(frontend)/lib/api/analytics";
import { Skeleton } from "@/app/(frontend)/components/ui/skeleton";
import { ErrorState } from "@/app/(frontend)/components/ui/error-state";
import { formatCount, cn } from "@/app/(frontend)/lib/utils";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

type Period = "7d" | "30d" | "90d" | "1y";

function StatCard({ icon: Icon, label, value, growth, loading }: { icon: React.ElementType; label: string; value: number; growth?: number | null; loading?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-purple-400" />
        </div>
        {growth != null && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", growth >= 0 ? "text-green-400" : "text-red-400")}>
            {growth >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(growth)}%
          </div>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-20 mb-1" />
      ) : (
        <p className="text-2xl font-bold text-white">{formatCount(value)}</p>
      )}
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { language, t } = useI18n();
  const [period, setPeriod] = useState<Period>("30d");

  const { data: overviewData, isLoading: overviewLoading, error } = useQuery({
    queryKey: ["analytics-overview", period],
    queryFn: () => analyticsApi.overview(period),
  });

  const { data: playsData, isLoading: playsLoading } = useQuery({
    queryKey: ["analytics-plays", period],
    queryFn: () => analyticsApi.plays(period),
  });

  const { data: topData } = useQuery({
    queryKey: ["analytics-top", "playCount"],
    queryFn: () => analyticsApi.topContent("playCount", 5),
  });

  const overview = overviewData?.data;
  const playsChart = playsData?.data?.series ?? [];
  const topMixes = topData?.data?.mixes ?? [];

  if (error) return (
    <RequireAuth role="ARTIST">
      <div className="p-8"><ErrorState message={t("dashboard.loadError")} /></div>
    </RequireAuth>
  );

  return (
    <RequireAuth role="ARTIST">
      <div className="px-4 lg:px-8 py-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{t("dashboard.title")}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{t("dashboard.subtitle")}</p>
          </div>
          {/* Period selector */}
          <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1 border border-white/[0.06]">
            {(["7d", "30d", "90d", "1y"] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                  period === p ? "bg-white text-black" : "text-zinc-400 hover:text-white")}
              >
                {p === "1y" ? (language === "fr" ? "1 an" : "1y") : p}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard icon={BarChart3} label={t("dashboard.totalPlays")} value={overview?.totalPlays ?? 0} growth={overview?.playsGrowth} loading={overviewLoading} />
          <StatCard icon={Heart} label={t("dashboard.likes")} value={overview?.totalLikes ?? 0} loading={overviewLoading} />
          <StatCard icon={Users} label={t("dashboard.followers")} value={overview?.totalFollowers ?? 0} growth={overview?.followersGrowth} loading={overviewLoading} />
          <StatCard icon={Music2} label={t("dashboard.published")} value={overview?.totalMixes ?? 0} loading={overviewLoading} />
        </div>

        {/* Plays chart */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><TrendingUp className="h-4 w-4 text-purple-400" />{t("dashboard.playsEvolution")}</h2>
          </div>
          {playsLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : playsChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={playsChart}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} width={35} />
                <Tooltip contentStyle={{ background: "#111318", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }} labelStyle={{ color: "#9CA3AF", fontSize: 11 }} itemStyle={{ color: "#A855F7" }} />
                <Area type="monotone" dataKey="total" stroke="#A855F7" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-zinc-500 py-8 text-center">{t("dashboard.noDataPeriod")}</p>
          )}
        </div>

        {/* Top mixes */}
        {topMixes.length > 0 && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Disc3 className="h-4 w-4 text-purple-400" />{t("dashboard.topMixes")}</h2>
            <div className="space-y-3">
              {topMixes.map((mix, i) => (
                <div key={mix.id} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-600 w-4 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{mix.title}</p>
                  </div>
                  <span className="text-xs text-zinc-500">{formatCount(mix.playCount)} {t("common.plays")}</span>
                  <span className="text-xs text-zinc-500 inline-flex items-center gap-1">
                    {formatCount(mix.likeCount)} <Heart className="h-3 w-3 text-pink-500 fill-current" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
