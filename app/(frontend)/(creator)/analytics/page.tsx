"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Globe,
  Users,
  Clock,
  Disc3,
  MapPin,
  Zap,
  TrendingUp,
  Heart,
  MessageCircle,
  Download,
  Play,
  Pause,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/app/(frontend)/components/auth/require-auth";
import { analyticsApi, type TopContentItem } from "@/app/(frontend)/lib/api/analytics";
import { usePlayer, type PlayerTrack } from "@/app/(frontend)/providers/player-provider";
import { Skeleton } from "@/app/(frontend)/components/ui/skeleton";
import { ErrorState } from "@/app/(frontend)/components/ui/error-state";
import { formatCount, genreLabel, cn } from "@/app/(frontend)/lib/utils";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

type Period = "7d" | "30d" | "90d" | "1y";
type Tab = "overview-plays" | "geo" | "hours" | "top";

const CHART_COLORS = [
  "#A855F7", // Purple
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#F97316", // Orange
  "#8B5CF6", // Violet
  "#06B6D4", // Cyan
];

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}h`;
}

function formatDate(dateStr: string, lang: "fr" | "en" = "fr"): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "2-digit", month: "short" });
  } catch {
    return dateStr;
  }
}

export default function AnalyticsPage() {
  const { language, tr } = useI18n();
  const { play, track: currentTrack, isPlaying, togglePlay } = usePlayer();

  const [period, setPeriod] = useState<Period>("30d");
  const [activeTab, setActiveTab] = useState<Tab>("overview-plays");
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const [topSort, setTopSort] = useState<"playCount" | "likeCount" | "commentCount">("playCount");
  const [contentType, setContentType] = useState<"all" | "mixes" | "tracks">("all");

  // 1. Overview KPIs
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ["analytics-overview", period],
    queryFn: () => analyticsApi.overview(period),
  });

  // 2. Plays Time-series
  const { data: playsData, isLoading: playsLoading } = useQuery({
    queryKey: ["analytics-plays", period, granularity],
    queryFn: () => analyticsApi.plays(period, granularity),
  });

  // 3. Audience (Country, City, Peak hours)
  const { data: audienceData, isLoading: audienceLoading, error } = useQuery({
    queryKey: ["analytics-audience", period],
    queryFn: () => analyticsApi.audience(period),
  });

  // 4. Top Content
  const { data: topData, isLoading: topLoading } = useQuery({
    queryKey: ["analytics-top-content", topSort],
    queryFn: () => analyticsApi.topContent(topSort, 15),
  });

  const overview = overviewData?.data;
  const audience = audienceData?.data;
  const playsSeries = useMemo(() => playsData?.data?.series ?? [], [playsData]);
  const topMixes = useMemo(() => topData?.data?.mixes ?? [], [topData]);
  const topTracks = useMemo(() => topData?.data?.tracks ?? [], [topData]);

  // Filter top content by content type tab
  const filteredTop = useMemo(() => {
    const list: TopContentItem[] = [];
    if (contentType === "all" || contentType === "mixes") list.push(...topMixes);
    if (contentType === "all" || contentType === "tracks") list.push(...topTracks);
    return list.sort((a, b) => b[topSort] - a[topSort]);
  }, [topMixes, topTracks, contentType, topSort]);

  // Find peak hour
  const peakHour = useMemo(() => {
    if (!audience?.peakHours || audience.peakHours.length === 0) return null;
    return audience.peakHours.reduce((max, h) => (h.plays > max.plays ? h : max), audience.peakHours[0]);
  }, [audience]);

  // Total plays in current period from series
  const totalPeriodStreams = useMemo(() => {
    return playsSeries.reduce((sum, item) => sum + item.total, 0);
  }, [playsSeries]);

  // Average streams per day in period
  const avgDailyStreams = useMemo(() => {
    if (playsSeries.length === 0) return 0;
    return Math.round(totalPeriodStreams / playsSeries.length);
  }, [playsSeries, totalPeriodStreams]);

  // Handle Play Top Content
  const handlePlayContent = (item: TopContentItem) => {
    if (!item.audioUrl) {
      toast.info(tr("Aperçu audio non disponible", "Audio preview unavailable"));
      return;
    }
    if (currentTrack?.id === item.id) {
      togglePlay();
      return;
    }
    const pt: PlayerTrack = {
      id: item.id,
      slug: item.slug,
      title: item.title,
      audioUrl: item.audioUrl,
      coverUrl: item.coverUrl,
      durationSec: item.durationSec ?? null,
      artist: {
        id: "creator",
        slug: "",
        stageName: tr("Mon profil DJ", "My DJ profile"),
        avatarUrl: null,
      },
      type: item.type,
    };
    play(pt);
  };

  // Export Analytics to JSON
  const handleExportData = () => {
    const exportPayload = {
      period,
      generatedAt: new Date().toISOString(),
      overview,
      audience: {
        uniqueListeners: audience?.uniqueListeners,
        avgListenDurationMinutes: Math.round((audience?.avgListenDurationMs ?? 0) / 1000 / 60),
        byCountry: audience?.byCountry,
        byCity: audience?.byCity,
        peakHours: audience?.peakHours,
      },
      playsSeries,
      topContent: filteredTop,
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `afromix-analytics-${period}-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(tr("Rapport analytics téléchargé avec succès !", "Analytics report downloaded!"));
  };

  if (error) {
    return (
      <RequireAuth role="ARTIST">
        <div className="p-8">
          <ErrorState message={language === "fr" ? "Statistiques temporairement indisponibles" : "Analytics unavailable"} />
        </div>
      </RequireAuth>
    );
  }

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: "overview-plays", label: tr("Évolution des écoutes", "Plays over time"), icon: TrendingUp },
    { id: "geo", label: tr("Audience & Géographie", "Audience & Geography"), icon: Globe },
    { id: "hours", label: tr("Heures d'écoute", "Listening hours"), icon: Clock },
    { id: "top", label: tr("Top Contenu", "Top Content"), icon: Disc3 },
  ];

  return (
    <RequireAuth role="ARTIST">
      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8 select-none">
        {/* ── 1. Hero Header & Global Filter Controls ─────────────── */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-white/[0.08] bg-gradient-to-br from-[#191124] via-[#10121a] to-[#08090e] shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <span>{tr("Studio Créateur & DJ", "Creator & DJ Studio")}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {tr("Statistiques & Analytics", "Stats & Analytics")}
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-2xl">
                {tr("Visualisez la portée de vos sets, vos auditeurs en direct et vos performances de streaming à travers le monde.", "See the reach of your sets, your live listeners and your streaming performance around the world.")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
              {/* Period Selector */}
              <div className="flex items-center gap-1 bg-[#121319] rounded-2xl p-1 border border-white/[0.08]">
                {(["7d", "30d", "90d", "1y"] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all",
                      period === p
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-900/30"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    {p === "7d" ? "7 jours" : p === "30d" ? "30 jours" : p === "90d" ? "90 jours" : "1 an"}
                  </button>
                ))}
              </div>

              {/* Export Button */}
              <button
                onClick={handleExportData}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 hover:text-white border border-white/[0.08] text-xs font-bold transition-all hover:scale-105 active:scale-95"
                title={tr("Exporter les données", "Export data")}
              >
                <Download className="h-4 w-4 text-purple-400" />
                <span className="hidden sm:inline">{tr("Exporter", "Export")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. Primary KPI Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Plays */}
          <div className="rounded-3xl bg-[#11131a] border border-white/[0.06] p-5 relative overflow-hidden shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-400" />
              </div>
              {overview?.playsGrowth != null && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-bold",
                    overview.playsGrowth >= 0
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-red-500/15 text-red-400 border border-red-500/30"
                  )}
                >
                  {overview.playsGrowth >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {Math.abs(overview.playsGrowth)}%
                </span>
              )}
            </div>
            {overviewLoading ? (
              <Skeleton className="h-8 w-24 mb-1 bg-white/[0.04]" />
            ) : (
              <p className="text-3xl font-black text-white tracking-tight">
                {formatCount(overview?.totalPlays ?? 0)}
              </p>
            )}
            <p className="text-xs text-zinc-400 mt-1 font-medium">{tr("Écoutes cumulées", "Total plays")}</p>
          </div>

          {/* Card 2: Unique Listeners */}
          <div className="rounded-3xl bg-[#11131a] border border-white/[0.06] p-5 relative overflow-hidden shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                Audience
              </span>
            </div>
            {audienceLoading ? (
              <Skeleton className="h-8 w-24 mb-1 bg-white/[0.04]" />
            ) : (
              <p className="text-3xl font-black text-white tracking-tight">
                {formatCount(audience?.uniqueListeners ?? 0)}
              </p>
            )}
            <p className="text-xs text-zinc-400 mt-1 font-medium">{tr("Auditeurs uniques", "Unique listeners")}</p>
          </div>

          {/* Card 3: Avg Duration */}
          <div className="rounded-3xl bg-[#11131a] border border-white/[0.06] p-5 relative overflow-hidden shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-pink-400" />
              </div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                {tr("Rétention", "Retention")}
              </span>
            </div>
            {audienceLoading ? (
              <Skeleton className="h-8 w-24 mb-1 bg-white/[0.04]" />
            ) : (
              <p className="text-3xl font-black text-white tracking-tight">
                {Math.round((audience?.avgListenDurationMs ?? 0) / 1000 / 60)} min
              </p>
            )}
            <p className="text-xs text-zinc-400 mt-1 font-medium">{tr("Temps moyen par écoute", "Average listening time")}</p>
          </div>

          {/* Card 4: Global Reach */}
          <div className="rounded-3xl bg-[#11131a] border border-white/[0.06] p-5 relative overflow-hidden shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <Globe className="h-5 w-5 text-amber-400" />
              </div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                {tr("Monde", "World")}
              </span>
            </div>
            {audienceLoading ? (
              <Skeleton className="h-8 w-24 mb-1 bg-white/[0.04]" />
            ) : (
              <p className="text-3xl font-black text-white tracking-tight">
                {audience?.byCountry?.length ?? 0}
              </p>
            )}
            <p className="text-xs text-zinc-400 mt-1 font-medium">{tr("Pays auditeurs", "Listener countries")}</p>
          </div>
        </div>

        {/* ── 3. Tabbed Detailed Analysis ───────────────────────────── */}
        <div className="space-y-6">
          {/* Tabs Navigation Bar */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#121319] border border-white/[0.06] overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap",
                    isActive
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Plays Evolution (Time-Series) */}
          {activeTab === "overview-plays" && (
            <div className="rounded-3xl bg-[#0f1117] border border-white/[0.06] p-6 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-400" />
                    <span>{tr("Évolution temporelle des streams", "Streams over time")}</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {tr("Moyenne", "Average")} : <span className="font-bold text-purple-300">{formatCount(avgDailyStreams)}</span> {tr("écoutes/jour sur la période", "plays/day over the period")}
                  </p>
                </div>

                {/* Granularity switch */}
                <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06] self-start sm:self-auto">
                  {(["day", "week", "month"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGranularity(g)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                        granularity === g ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
                      )}
                    >
                      {g === "day" ? "Jour" : g === "week" ? "Semaine" : "Mois"}
                    </button>
                  ))}
                </div>
              </div>

              {playsLoading ? (
                <Skeleton className="h-72 w-full rounded-2xl bg-white/[0.03]" />
              ) : playsSeries.length > 0 ? (
                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={playsSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="mixesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#A855F7" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="tracksGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v: string) => formatDate(v, language)}
                        tick={{ fontSize: 11, fill: "#9CA3AF" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#9CA3AF" }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tickFormatter={(v) => formatCount(v)}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#12141c",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 16,
                          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
                        }}
                        labelFormatter={(v) => `Date : ${formatDate(v as string, language)}`}
                        formatter={(val, name) => [
                          formatCount(val as number),
                          name === "mixes" ? "Streams Mixes" : name === "tracks" ? "Streams Tracks" : "Total",
                        ]}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        formatter={(value) => (
                          <span className="text-xs text-zinc-300 font-medium">
                            {value === "mixes" ? "Mixes" : value === "tracks" ? "Morceaux" : "Total"}
                          </span>
                        )}
                      />
                      <Area type="monotone" dataKey="mixes" stroke="#A855F7" strokeWidth={2.5} fill="url(#mixesGrad)" />
                      <Area type="monotone" dataKey="tracks" stroke="#EC4899" strokeWidth={2} fill="url(#tracksGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-16 text-center text-zinc-500 text-sm">
                  {tr("Aucun historique de streams enregistré sur cette période.", "No stream history for this period.")}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Geography & Cities */}
          {activeTab === "geo" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Audience par Pays */}
              <div className="rounded-3xl bg-[#0f1117] border border-white/[0.06] p-6 shadow-xl space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Globe className="h-4 w-4 text-purple-400" />
                  <span>{tr("Répartition par Pays", "Breakdown by country")}</span>
                </h3>

                {audienceLoading ? (
                  <Skeleton className="h-64 w-full rounded-2xl bg-white/[0.03]" />
                ) : audience && audience.byCountry.length > 0 ? (
                  <div className="space-y-4">
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={audience.byCountry.slice(0, 6)}
                            dataKey="plays"
                            nameKey="country"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={4}
                            stroke="none"
                          >
                            {audience.byCountry.slice(0, 6).map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "#12141c",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: 12,
                            }}
                            formatter={(v) => [`${formatCount(v as number)} écoutes`, "Streams"]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="divide-y divide-white/[0.04]">
                      {audience.byCountry.slice(0, 6).map((item, i) => (
                        <div key={item.country} className="flex items-center justify-between py-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                            />
                            <span className="font-semibold text-white">{item.country}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-zinc-400">{formatCount(item.plays)} {tr("écoutes", "plays")}</span>
                            <span className="font-bold text-purple-400 w-10 text-right">{item.pct}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-zinc-500 text-xs py-10 text-center">{tr("Aucune donnée géographique enregistrée.", "No geographic data yet.")}</p>
                )}
              </div>

              {/* Audience par Ville */}
              <div className="rounded-3xl bg-[#0f1117] border border-white/[0.06] p-6 shadow-xl space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-pink-400" />
                  <span>{tr("Top Villes", "Top Cities")}</span>
                </h3>

                {audienceLoading ? (
                  <Skeleton className="h-64 w-full rounded-2xl bg-white/[0.03]" />
                ) : audience && audience.byCity && audience.byCity.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    {audience.byCity.slice(0, 8).map((row, i) => (
                      <div key={`${row.city}-${row.country}`} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white">
                            {i + 1}. {row.city} <span className="text-zinc-500 font-normal">({row.country})</span>
                          </span>
                          <span className="text-zinc-400">{formatCount(row.plays)} ({row.pct}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(row.pct, 4)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-xs py-10 text-center">{tr("Aucune donnée de ville pour le moment.", "No city data yet.")}</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Peak Hours & Heatmap */}
          {activeTab === "hours" && (
            <div className="rounded-3xl bg-[#0f1117] border border-white/[0.06] p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-400" />
                    <span>{tr("Créneaux d'écoute les plus actifs (24h)", "Most active listening hours (24h)")}</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {tr("Identifiez le meilleur moment pour programmer la sortie de vos prochains sets.", "Find the best time to release your next sets.")}
                  </p>
                </div>

                {peakHour && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span>{tr("Pic", "Peak")} : {formatHour(peakHour.hour)} ({formatCount(peakHour.plays)} streams)</span>
                  </div>
                )}
              </div>

              {audienceLoading ? (
                <Skeleton className="h-64 w-full rounded-2xl bg-white/[0.03]" />
              ) : audience?.peakHours ? (
                <div className="space-y-6">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={audience.peakHours}>
                        <defs>
                          <linearGradient id="peakHourGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#A855F7" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="hour" tickFormatter={formatHour} tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} width={35} tickFormatter={(v) => formatCount(v)} />
                        <Tooltip
                          contentStyle={{
                            background: "#12141c",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 12,
                          }}
                          labelFormatter={(h) => `${tr("Heure", "Hour")} : ${formatHour(h as number)}`}
                          formatter={(v) => [`${formatCount(v as number)} streams`, "Écoutes"]}
                        />
                        <Area type="monotone" dataKey="plays" stroke="#A855F7" strokeWidth={2.5} fill="url(#peakHourGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 24-slot Heatmap Grid */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-zinc-400">{tr("Intensité horaire", "Hourly intensity")}</span>
                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                      {audience.peakHours.map((h) => {
                        const maxPlays = Math.max(...audience.peakHours.map((x) => x.plays), 1);
                        const intensity = h.plays / maxPlays;
                        return (
                          <div
                            key={h.hour}
                            className="p-2.5 rounded-xl border border-white/[0.04] text-center transition-all hover:scale-105 select-none"
                            style={{
                              backgroundColor: intensity > 0 ? `rgba(168, 85, 247, ${0.12 + intensity * 0.6})` : "rgba(255,255,255,0.02)",
                            }}
                            title={`${formatHour(h.hour)} : ${h.plays} ${tr("écoutes", "plays")}`}
                          >
                            <p className="text-[10px] text-zinc-400 font-mono">{formatHour(h.hour)}</p>
                            <p className="text-xs font-black text-white mt-0.5">{formatCount(h.plays)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-500 text-xs py-10 text-center">{tr("Aucune donnée horaire disponible.", "No hourly data available.")}</p>
              )}
            </div>
          )}

          {/* TAB 4: Top Content Leaderboard */}
          {activeTab === "top" && (
            <div className="rounded-3xl bg-[#0f1117] border border-white/[0.06] overflow-hidden shadow-xl space-y-4 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Disc3 className="h-4 w-4 text-purple-400" />
                    <span>{tr("Top Titres & Mixes", "Top Tracks & Mixes")}</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {tr("Classement de vos créations selon leur popularité auprès des auditeurs.", "Your releases ranked by popularity with listeners.")}
                  </p>
                </div>

                {/* Filter and Sort controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06] text-xs">
                    {(["all", "mixes", "tracks"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setContentType(t)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg font-semibold transition-all",
                          contentType === t ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
                        )}
                      >
                        {t === "all" ? "Tous" : t === "mixes" ? "Mixes" : "Tracks"}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06] text-xs">
                    {(["playCount", "likeCount", "commentCount"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setTopSort(s)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg font-semibold transition-all",
                          topSort === s ? "bg-purple-600 text-white font-bold" : "text-zinc-400 hover:text-white"
                        )}
                      >
                        {s === "playCount" ? "Écoutes" : s === "likeCount" ? "Likes" : "Commentaires"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {topLoading ? (
                <div className="space-y-3 pt-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-2xl bg-white/[0.03]" />
                  ))}
                </div>
              ) : filteredTop.length > 0 ? (
                <div className="divide-y divide-white/[0.04] pt-2">
                  {filteredTop.map((item, idx) => {
                    const isItemPlaying = currentTrack?.id === item.id && isPlaying;
                    const maxCount = Math.max(...filteredTop.map((x) => x[topSort]), 1);
                    const pctOfMax = (item[topSort] / maxCount) * 100;

                    return (
                      <div
                        key={item.id}
                        className="py-3 px-2 flex items-center justify-between gap-4 hover:bg-white/[0.02] rounded-2xl transition-colors group"
                      >
                        {/* Left: Rank + Cover + Title */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-xs font-black text-zinc-500 w-5 text-center flex-shrink-0">
                            #{idx + 1}
                          </span>

                          <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 shadow-sm">
                            {item.coverUrl ? (
                              <Image src={item.coverUrl} alt={item.title} fill className="object-cover" sizes="48px" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-base">
                                <Disc3 className="h-5 w-5 text-purple-400" />
                              </div>
                            )}

                            {/* Play overlay button */}
                            {item.audioUrl && (
                              <button
                                onClick={() => handlePlayContent(item)}
                                className={cn(
                                  "absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity",
                                  isItemPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                )}
                              >
                                {isItemPlaying ? (
                                  <Pause className="h-5 w-5 text-purple-400 fill-current" />
                                ) : (
                                  <Play className="h-5 w-5 text-white fill-current ml-0.5" />
                                )}
                              </button>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <Link
                              href={item.type === "mix" ? `/mixes/${item.slug}` : `/tracks/${item.slug}`}
                              className="text-sm font-bold text-white hover:text-purple-300 transition-colors truncate block"
                            >
                              {item.title}
                            </Link>
                            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                              <span className="px-1.5 py-0.2 rounded-md bg-white/[0.06] text-[10px] text-zinc-400">
                                {genreLabel(item.genre, language)}
                              </span>
                              <span>• {item.type === "mix" ? "Mix DJ" : "Titre"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Relative Bar & Counts */}
                        <div className="flex items-center gap-6 flex-shrink-0">
                          <div className="w-28 hidden md:block">
                            <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                                style={{ width: `${Math.max(pctOfMax, 5)}%` }}
                              />
                            </div>
                          </div>

                          <div className="text-right min-w-[70px]">
                            <p className="text-sm font-black text-white">{formatCount(item.playCount)}</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">streams</p>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-zinc-400">
                            <span className="flex items-center gap-1 text-pink-400">
                              <Heart className="h-3.5 w-3.5 fill-current" />
                              {formatCount(item.likeCount)}
                            </span>
                            <span className="flex items-center gap-1 text-purple-400">
                              <MessageCircle className="h-3.5 w-3.5" />
                              {formatCount(item.commentCount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-zinc-500 text-xs py-10 text-center">{tr("Aucun contenu trouvé pour ces critères.", "No content matches these filters.")}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
