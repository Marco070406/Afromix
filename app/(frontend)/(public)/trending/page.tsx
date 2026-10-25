"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Trophy,
  Crown,
  Flame,
  Play,
  Pause,
  Shuffle,
  Heart,
  ListPlus,
  Share2,
  Search,
  Headphones,
  Disc3,
  UserCheck,
  Users,
  Sparkles,
  Music2,
  Radio,
  Check,
  Music,
} from "lucide-react";
import { toast } from "sonner";
import { discoveryApi } from "@/app/(frontend)/lib/api/discovery";
import { usePlayer, type PlayerTrack } from "@/app/(frontend)/providers/player-provider";
import { useAddToPlaylist } from "@/app/(frontend)/providers/playlist-modal-provider";
import { useLikedMixIds } from "@/app/(frontend)/hooks/use-liked-mix-ids";
import { formatCount, formatDuration, genreLabel, cn } from "@/app/(frontend)/lib/utils";
import type { MixSummary, TrackSummary, ArtistSummary } from "@/types/api";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

const PERIODS = [
  { id: "24h", label: "Aujourd'hui", labelEn: "Today", shortLabel: "24h", icon: Flame },
  { id: "7d", label: "Cette semaine", labelEn: "This week", shortLabel: "7 jours", icon: TrendingUp },
  { id: "30d", label: "Ce mois-ci", labelEn: "This month", shortLabel: "30 jours", icon: Trophy },
] as const;
type Period = (typeof PERIODS)[number]["id"];

type ChartTab = "mixes" | "artists" | "tracks";

const POPULAR_GENRES = [
  { id: "", label: "Tous genres", labelEn: "All genres" },
  { id: "AFROBEATS", label: "Afrobeats" },
  { id: "AMAPIANO", label: "Amapiano" },
  { id: "AFRO_HOUSE", label: "Afro House" },
  { id: "NDOMBOLO", label: "Ndombolo" },
  { id: "BONGO_FLAVA", label: "Bongo Flava" },
  { id: "HIGHLIFE", label: "Highlife" },
  { id: "DANCEHALL", label: "Dancehall" },
  { id: "KIZOMBA", label: "Kizomba" },
  { id: "KUDURO", label: "Kuduro" },
  { id: "RUMBA", label: "Rumba" },
  { id: "AFRO_SOUL", label: "Afro Soul" },
  { id: "SOCA", label: "Soca" },
];

function mixToPlayerTrack(mix: MixSummary): PlayerTrack | null {
  if (!mix.audioUrl) return null;
  return {
    id: mix.id,
    slug: mix.slug,
    title: mix.title,
    audioUrl: mix.audioUrl,
    coverUrl: mix.coverUrl,
    durationSec: mix.durationSec,
    artist: {
      id: mix.artist.id,
      slug: mix.artist.slug,
      stageName: mix.artist.stageName,
      avatarUrl: mix.artist.avatarUrl,
    },
    type: "mix",
  };
}

function trackToPlayerTrack(track: TrackSummary): PlayerTrack | null {
  if (!track.audioUrl || !track.artist) return null;
  return {
    id: track.id,
    slug: track.slug,
    title: track.title,
    audioUrl: track.audioUrl,
    coverUrl: track.coverUrl,
    durationSec: track.durationSec,
    artist: track.artist,
    type: "track",
  };
}

function TrendingContent() {
  const { tr } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL query params or fallback
  const initialTab = (searchParams.get("tab") as ChartTab) || "mixes";
  const initialPeriod = (searchParams.get("period") as Period) || "7d";
  const initialGenre = searchParams.get("genre") || "";

  const [activeTab, setActiveTab] = useState<ChartTab>(initialTab);
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [genre, setGenre] = useState<string>(initialGenre);
  const [searchFilter, setSearchFilter] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const { play, track: currentTrack, isPlaying, togglePlay } = usePlayer();
  const { isLiked, toggleLike } = useLikedMixIds();
  const { openAddToPlaylist } = useAddToPlaylist();

  // Update URL search parameters smoothly
  const updateUrl = (newTab: ChartTab, newPeriod: Period, newGenre: string) => {
    const params = new URLSearchParams();
    if (newTab !== "mixes") params.set("tab", newTab);
    if (newPeriod !== "7d") params.set("period", newPeriod);
    if (newGenre) params.set("genre", newGenre);
    const queryString = params.toString();
    router.replace(`/trending${queryString ? `?${queryString}` : ""}`, { scroll: false });
  };

  const handleTabChange = (tab: ChartTab) => {
    setActiveTab(tab);
    updateUrl(tab, period, genre);
  };

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    updateUrl(activeTab, p, genre);
  };

  const handleGenreChange = (g: string) => {
    const next = g === genre ? "" : g;
    setGenre(next);
    updateUrl(activeTab, period, next);
  };

  // Fetch charts data
  const { data, isLoading } = useQuery({
    queryKey: ["trending", period, genre, activeTab],
    queryFn: () =>
      discoveryApi.trending({
        period,
        genre: genre || undefined,
        type: activeTab === "mixes" ? "mixes" : activeTab === "artists" ? "artists" : "tracks",
        limit: 50,
      }),
    staleTime: 3 * 60 * 1000,
  });

  const mixes = useMemo<MixSummary[]>(() => data?.data?.mixes ?? [], [data]);
  const tracks = useMemo<TrackSummary[]>(() => data?.data?.tracks ?? [], [data]);
  const artists = useMemo<ArtistSummary[]>(() => data?.data?.artists ?? [], [data]);

  // Filtered by client-side quick search query
  const filteredMixes = useMemo(() => {
    if (!searchFilter.trim()) return mixes;
    const q = searchFilter.toLowerCase();
    return mixes.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.artist.stageName.toLowerCase().includes(q) ||
        (m.genre && m.genre.toLowerCase().includes(q))
    );
  }, [mixes, searchFilter]);

  const filteredArtists = useMemo(() => {
    if (!searchFilter.trim()) return artists;
    const q = searchFilter.toLowerCase();
    return artists.filter(
      (a) =>
        a.stageName.toLowerCase().includes(q) ||
        (a.country && a.country.toLowerCase().includes(q)) ||
        (a.genres && a.genres.some((g) => g.toLowerCase().includes(q)))
    );
  }, [artists, searchFilter]);

  const filteredTracks = useMemo(() => {
    if (!searchFilter.trim()) return tracks;
    const q = searchFilter.toLowerCase();
    return tracks.filter(
      (tr) =>
        tr.title.toLowerCase().includes(q) ||
        (tr.artist?.stageName && tr.artist.stageName.toLowerCase().includes(q)) ||
        (tr.genre && tr.genre.toLowerCase().includes(q))
    );
  }, [tracks, searchFilter]);

  // Action: Play Entire Chart
  const handlePlayAll = (shuffle = false) => {
    if (activeTab === "mixes") {
      const valid = filteredMixes
        .map(mixToPlayerTrack)
        .filter((item): item is PlayerTrack => !!item);
      if (valid.length === 0) {
        toast.info(tr("Aucun audio disponible dans ce classement", "No audio available in this chart"));
        return;
      }
      const queueList = shuffle ? [...valid].sort(() => Math.random() - 0.5) : valid;
      play(queueList[0], queueList);
      toast.success(tr(`Lecture lancée : ${queueList.length} mixes dans la file`, `Now playing: ${queueList.length} mixes in the queue`));
    } else if (activeTab === "tracks") {
      const valid = filteredTracks
        .map(trackToPlayerTrack)
        .filter((item): item is PlayerTrack => !!item);
      if (valid.length === 0) {
        toast.info(tr("Aucun titre disponible dans ce classement", "No tracks available in this chart"));
        return;
      }
      const queueList = shuffle ? [...valid].sort(() => Math.random() - 0.5) : valid;
      play(queueList[0], queueList);
      toast.success(tr(`Lecture lancée : ${queueList.length} titres dans la file`, `Now playing: ${queueList.length} tracks in the queue`));
    } else if (activeTab === "artists") {
      const validDjsMixes = filteredArtists
        .filter((a) => a.topMix?.audioUrl)
        .map((a) => ({
          id: a.topMix!.id,
          slug: a.topMix!.slug,
          title: a.topMix!.title,
          audioUrl: a.topMix!.audioUrl!,
          coverUrl: a.topMix!.coverUrl || a.avatarUrl,
          durationSec: a.topMix!.durationSec,
          artist: {
            id: a.id,
            slug: a.slug,
            stageName: a.stageName,
            avatarUrl: a.avatarUrl,
          },
          type: "mix" as const,
        }));
      if (validDjsMixes.length === 0) {
        toast.info(tr("Aucun mix phare disponible", "No featured mix available"));
        return;
      }
      const queueList = shuffle ? [...validDjsMixes].sort(() => Math.random() - 0.5) : validDjsMixes;
      play(queueList[0], queueList);
      toast.success(tr("Lecture lancée : mixes phares des Top DJs", "Now playing: Top DJs' featured mixes"));
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success(tr("Lien du classement copié dans le presse-papier !", "Chart link copied to clipboard!"));
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8 select-none w-full min-w-0">
      {/* ── 1. Hero Header Banner ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-10 border border-white/[0.08] bg-gradient-to-br from-[#180e29] via-[#0f1118] to-[#08090d] shadow-2xl">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-purple-600/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider shadow-inner">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span>{tr("Classements Officiels AfroMix", "Official AfroMix Charts")}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              {tr("Le Top 50 des", "The Top 50")} <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-pink-400 to-purple-400">
                {tr("Rythmes Africains", "African Rhythms")}
              </span>
            </h1>

            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              {tr(
                "Le baromètre incontournable de la musique afro. Écoutes certifiées, classements actualisés en temps réel et pépites du continent.",
                "The go-to barometer of Afro music. Certified plays, real-time charts and the continent's hidden gems."
              )}
            </p>

            {/* Quick Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1.5 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.06]">
                <Radio className="h-3 w-3 text-emerald-400" />
                {tr("Streams réels vérifiés", "Verified real streams")}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.06]">
                <Sparkles className="h-3 w-3 text-amber-400" />
                {tr("50 titres classés", "50 ranked tracks")}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.06]">
                <TrendingUp className="h-3 w-3 text-purple-400" />
                {tr("Actualisation continue", "Continuously updated")}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-center flex-shrink-0">
            <button
              onClick={() => handlePlayAll(false)}
              className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:via-pink-500 hover:to-amber-400 text-white font-bold text-sm shadow-xl shadow-purple-900/30 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
            >
              <Play className="h-4 w-4 fill-current ml-0.5" />
              <span>{tr("Tout écouter", "Play all")}</span>
            </button>

            <button
              onClick={() => handlePlayAll(true)}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 hover:text-white font-semibold text-sm border border-white/[0.08] hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
              title={tr("Lecture aléatoire du classement", "Shuffle the chart")}
            >
              <Shuffle className="h-4 w-4" />
              <span className="hidden sm:inline">{tr("Aléatoire", "Shuffle")}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white border border-white/[0.08] hover:scale-105 active:scale-95 transition-all flex-shrink-0"
              title={tr("Partager ce classement", "Share this chart")}
            >
              {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Navigation Tabs & Period Switcher ──────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-4 min-w-0">
        {/* Main Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#121319] border border-white/[0.06] overflow-x-auto no-scrollbar max-w-full">
          <button
            onClick={() => handleTabChange("mixes")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap",
              activeTab === "mixes"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Disc3 className="h-4 w-4" />
            <span>Top Mixes</span>
            {mixes.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                {mixes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange("artists")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap",
              activeTab === "artists"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Users className="h-4 w-4" />
            <span>Top DJs</span>
            {artists.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                {artists.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange("tracks")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap",
              activeTab === "tracks"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Music2 className="h-4 w-4" />
            <span>{tr("Top Morceaux", "Top Tracks")}</span>
            {tracks.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                {tracks.length}
              </span>
            )}
          </button>
        </div>

        {/* Period Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#121319] border border-white/[0.06] flex-shrink-0 self-start md:self-auto overflow-x-auto no-scrollbar max-w-full">
          {PERIODS.map((p) => {
            const Icon = p.icon;
            const isSelected = period === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handlePeriodChange(p.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap",
                  isSelected
                    ? "bg-white text-black font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isSelected ? "text-amber-600" : "text-zinc-500")} />
                <span>{tr(p.label, p.labelEn)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. Genre Selector & Search Bar ────────────────────────── */}
      <div className="space-y-3 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          {/* Genre scrollable pill list */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 flex-1 min-w-0">
            {POPULAR_GENRES.map((g) => {
              const active = (g.id === "" && !genre) || genre === g.id;
              return (
                <button
                  key={g.id || "all"}
                  onClick={() => handleGenreChange(g.id)}
                  className={cn(
                    "flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border",
                    active
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent shadow-md shadow-purple-900/20"
                      : "bg-white/[0.03] text-zinc-400 hover:text-white border-white/[0.06] hover:bg-white/[0.06]"
                  )}
                >
                  {tr(g.label, g.labelEn ?? g.label)}
                </button>
              );
            })}
          </div>

          {/* Quick Filter Input */}
          <div className="relative min-w-[200px] sm:w-60 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={tr("Filtrer dans le classement...", "Filter the chart...")}
              className="w-full bg-[#121319] text-xs text-white placeholder-zinc-500 pl-9 pr-3 py-2 rounded-xl border border-white/[0.08] focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ── 4. Main Body Content Based on Active Tab ──────────────── */}
      {isLoading ? (
        <ChartSkeleton />
      ) : activeTab === "mixes" ? (
        <MixesChart
          mixes={filteredMixes}
          currentTrackId={currentTrack?.id}
          isPlaying={isPlaying}
          onPlayMix={(mix) => {
            const pt = mixToPlayerTrack(mix);
            if (!pt) return;
            if (currentTrack?.id === mix.id) togglePlay();
            else play(pt, filteredMixes.map(mixToPlayerTrack).filter((i): i is PlayerTrack => !!i));
          }}
          isLiked={isLiked}
          onToggleLike={toggleLike}
          onAddToPlaylist={openAddToPlaylist}
        />
      ) : activeTab === "artists" ? (
        <ArtistsChart
          artists={filteredArtists}
          currentTrackId={currentTrack?.id}
          isPlaying={isPlaying}
          onPlayArtistMix={(mix, artist) => {
            if (!mix?.audioUrl) return;
            const pt: PlayerTrack = {
              id: mix.id,
              slug: mix.slug,
              title: mix.title,
              audioUrl: mix.audioUrl,
              coverUrl: mix.coverUrl || artist.avatarUrl,
              durationSec: mix.durationSec,
              artist: {
                id: artist.id,
                slug: artist.slug,
                stageName: artist.stageName,
                avatarUrl: artist.avatarUrl,
              },
              type: "mix",
            };
            if (currentTrack?.id === mix.id) togglePlay();
            else play(pt);
          }}
        />
      ) : (
        <TracksChart
          tracks={filteredTracks}
          currentTrackId={currentTrack?.id}
          isPlaying={isPlaying}
          onPlayTrack={(track) => {
            const pt = trackToPlayerTrack(track);
            if (!pt) return;
            if (currentTrack?.id === track.id) togglePlay();
            else play(pt, filteredTracks.map(trackToPlayerTrack).filter((i): i is PlayerTrack => !!i));
          }}
          isLiked={isLiked}
          onToggleLike={toggleLike}
          onAddToPlaylist={openAddToPlaylist}
        />
      )}
    </div>
  );
}

// ── Podium Config for Gold / Silver / Bronze ─────────────────────────
const PODIUM_CONFIG = [
  {
    rank: 1,
    titleBadge: "N°1 AfroMix",
    bgCard: "bg-gradient-to-b from-amber-500/15 via-[#151310] to-[#0c0d12]",
    borderCard: "border-amber-500/40 hover:border-amber-400/70 shadow-amber-500/10",
    badgeBg: "bg-gradient-to-r from-amber-400 to-yellow-500 text-black",
    ringColor: "ring-amber-400/60",
    icon: Crown,
    glow: "text-amber-300",
  },
  {
    rank: 2,
    titleBadge: "N°2",
    bgCard: "bg-gradient-to-b from-slate-300/15 via-[#121318] to-[#0c0d12]",
    borderCard: "border-slate-300/30 hover:border-slate-300/60 shadow-slate-500/10",
    badgeBg: "bg-gradient-to-r from-slate-200 to-zinc-400 text-black",
    ringColor: "ring-slate-300/50",
    icon: Trophy,
    glow: "text-slate-200",
  },
  {
    rank: 3,
    titleBadge: "N°3",
    bgCard: "bg-gradient-to-b from-amber-700/15 via-[#141214] to-[#0c0d12]",
    borderCard: "border-amber-700/30 hover:border-amber-600/60 shadow-amber-900/10",
    badgeBg: "bg-gradient-to-r from-amber-600 to-amber-700 text-white",
    ringColor: "ring-amber-600/50",
    icon: Trophy,
    glow: "text-amber-400",
  },
];

// ── Mixes Chart Component ────────────────────────────────────────────
function MixesChart({
  mixes,
  currentTrackId,
  isPlaying,
  onPlayMix,
  isLiked,
  onToggleLike,
  onAddToPlaylist,
}: {
  mixes: MixSummary[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayMix: (mix: MixSummary) => void;
  isLiked: (id: string) => boolean;
  onToggleLike: (id: string) => void;
  onAddToPlaylist: (item: {
    id: string;
    type: "mix" | "track";
    title: string;
    coverUrl?: string | null;
    artistName?: string;
  }) => void;
}) {
  const { tr, language } = useI18n();
  if (mixes.length === 0) {
    return <EmptyChartsState />;
  }

  const topThree = mixes.slice(0, 3);
  const remaining = mixes.slice(3);

  return (
    <div className="space-y-8">
      {/* ── Podium Top 3 ──────────────────────────────────────────── */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {topThree.map((mix, idx) => {
            const conf = PODIUM_CONFIG[idx];
            const Icon = conf.icon;
            const isCurrent = currentTrackId === mix.id;
            const isPlayingThis = isCurrent && isPlaying;
            const liked = isLiked(mix.id);

            return (
              <div
                key={mix.id}
                className={cn(
                  "relative flex flex-col justify-between p-5 rounded-3xl border transition-all duration-300 shadow-xl group",
                  conf.bgCard,
                  conf.borderCard,
                  idx === 0 && "md:-translate-y-2 md:shadow-amber-500/15"
                )}
              >
                {/* Header Rank Badge */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm",
                      conf.badgeBg
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 fill-current" />
                    <span>#{idx + 1}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-400 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06]">
                    <Headphones className="h-3 w-3 text-purple-400" />
                    <span>{formatCount(mix.playCount)} {tr("écoutes", "plays")}</span>
                  </span>
                </div>

                {/* Cover & Play Overlay */}
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-zinc-900 mb-4 shadow-lg">
                  {mix.coverUrl ? (
                    <Image
                      src={mix.coverUrl}
                      alt={mix.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-tr from-purple-950 to-pink-950 text-4xl">
                      <Disc3 className="h-10 w-10 text-purple-300" />
                    </div>
                  )}

                  {/* Play Button Overlay */}
                  <div
                    className={cn(
                      "absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-200",
                      isPlayingThis ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                  >
                    <button
                      onClick={() => onPlayMix(mix)}
                      className="h-14 w-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl"
                      aria-label={isPlayingThis ? "Pause" : "Écouter le mix"}
                    >
                      {isPlayingThis ? (
                        <Pause className="h-6 w-6 fill-current" />
                      ) : (
                        <Play className="h-6 w-6 fill-current ml-0.5" />
                      )}
                    </button>
                  </div>

                  {/* Equalizer animation badge when playing */}
                  {isPlayingThis && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-purple-500/40 text-[10px] text-purple-300 font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
                      {tr("En lecture", "Playing")}
                    </div>
                  )}
                </div>

                {/* Title & Artist */}
                <div className="space-y-1 mb-4">
                  <Link
                    href={`/mixes/${mix.slug}`}
                    className="block text-base sm:text-lg font-bold text-white hover:text-purple-300 transition-colors truncate"
                  >
                    {mix.title}
                  </Link>

                  <Link
                    href={`/artists/${mix.artist.slug}`}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors truncate"
                  >
                    <span>{mix.artist.stageName}</span>
                    {mix.artist.verified && (
                      <UserCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />
                    )}
                  </Link>
                </div>

                {/* Bottom Bar: Genre + Duration + Actions */}
                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.04] text-[11px] font-semibold text-zinc-300 border border-white/[0.05]">
                    {genreLabel(mix.genre, language)}
                  </span>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono">{formatDuration(mix.durationSec)}</span>

                    <button
                      onClick={() =>
                        onAddToPlaylist({
                          id: mix.id,
                          type: "mix",
                          title: mix.title,
                          coverUrl: mix.coverUrl,
                          artistName: mix.artist.stageName,
                        })
                      }
                      className="text-zinc-500 hover:text-purple-400 transition-colors"
                      title={tr("Ajouter à une playlist", "Add to a playlist")}
                    >
                      <ListPlus className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => onToggleLike(mix.id)}
                      className={cn("transition-colors", liked ? "text-pink-500" : "text-zinc-500 hover:text-pink-400")}
                      title={tr("J'aime", "Like")}
                    >
                      <Heart className={cn("h-4 w-4", liked && "fill-current")} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Table Leaderboard (#4 to #50) ─────────────────────────── */}
      {remaining.length > 0 && (
        <div className="rounded-3xl bg-[#0f1117] border border-white/[0.06] overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="h-4 w-4 text-purple-400" />
              <span>{tr("Classement officiel", "Official chart")} (#4 {tr("à", "to")} #{mixes.length})</span>
            </h3>
            <span className="text-xs text-zinc-400">{remaining.length} {tr("mixes classés", "ranked mixes")}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-zinc-500 border-b border-white/[0.04] bg-white/[0.01]">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">{tr("Titre & DJ", "Title & DJ")}</th>
                  <th className="py-3 px-4 hidden md:table-cell">Genre</th>
                  <th className="py-3 px-4 text-right">{tr("Écoutes", "Plays")}</th>
                  <th className="py-3 px-4 hidden sm:table-cell text-right">{tr("Durée", "Duration")}</th>
                  <th className="py-3 px-4 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {remaining.map((mix, idx) => {
                  const rank = idx + 4;
                  const isCurrent = currentTrackId === mix.id;
                  const isPlayingThis = isCurrent && isPlaying;
                  const liked = isLiked(mix.id);

                  return (
                    <tr
                      key={mix.id}
                      className={cn(
                        "group hover:bg-white/[0.04] transition-colors",
                        isCurrent && "bg-purple-950/20"
                      )}
                    >
                      {/* Rank & Hover Play */}
                      <td className="py-3 px-4 text-center">
                        <div className="relative flex items-center justify-center h-8 w-8 mx-auto">
                          <span
                            className={cn(
                              "text-xs font-black text-zinc-500 group-hover:hidden",
                              isCurrent && "text-purple-400"
                            )}
                          >
                            {rank}
                          </span>
                          <button
                            onClick={() => onPlayMix(mix)}
                            className={cn(
                              "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                              isPlayingThis
                                ? "bg-purple-600 text-white"
                                : "hidden group-hover:flex bg-white text-black hover:scale-105"
                            )}
                            aria-label={isPlayingThis ? "Pause" : "Écouter"}
                          >
                            {isPlayingThis ? (
                              <Pause className="h-3.5 w-3.5 fill-current" />
                            ) : (
                              <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Cover & Title */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-11 w-11 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 shadow-sm">
                            {mix.coverUrl ? (
                              <Image
                                src={mix.coverUrl}
                                alt={mix.title}
                                fill
                                className="object-cover"
                                sizes="44px"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-sm">
                                <Headphones className="h-4 w-4 text-zinc-400" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <Link
                              href={`/mixes/${mix.slug}`}
                              className={cn(
                                "block font-bold truncate max-w-xs sm:max-w-md hover:text-purple-300 transition-colors",
                                isCurrent ? "text-purple-400" : "text-white"
                              )}
                            >
                              {mix.title}
                            </Link>
                            <Link
                              href={`/artists/${mix.artist.slug}`}
                              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors truncate block"
                            >
                              {mix.artist.stageName}
                            </Link>
                          </div>
                        </div>
                      </td>

                      {/* Genre */}
                      <td className="py-3 px-4 hidden md:table-cell">
                        <span className="px-2.5 py-1 rounded-full bg-white/[0.04] text-xs text-zinc-300 border border-white/[0.05]">
                          {genreLabel(mix.genre, language)}
                        </span>
                      </td>

                      {/* Plays */}
                      <td className="py-3 px-4 text-right font-medium text-zinc-300">
                        {formatCount(mix.playCount)}
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-4 hidden sm:table-cell text-right font-mono text-zinc-400 text-xs">
                        {formatDuration(mix.durationSec)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              onAddToPlaylist({
                                id: mix.id,
                                type: "mix",
                                title: mix.title,
                                coverUrl: mix.coverUrl,
                                artistName: mix.artist.stageName,
                              })
                            }
                            className="p-1 text-zinc-500 hover:text-purple-400 transition-colors"
                            title={tr("Ajouter à une playlist", "Add to a playlist")}
                          >
                            <ListPlus className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => onToggleLike(mix.id)}
                            className={cn(
                              "p-1 transition-colors",
                              liked ? "text-pink-500" : "text-zinc-500 hover:text-pink-400"
                            )}
                            title={tr("J'aime", "Like")}
                          >
                            <Heart className={cn("h-4 w-4", liked && "fill-current")} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Artists / DJs Chart Component ────────────────────────────────────
function ArtistsChart({
  artists,
  currentTrackId,
  isPlaying,
  onPlayArtistMix,
}: {
  artists: ArtistSummary[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayArtistMix: (
    mix: NonNullable<ArtistSummary["topMix"]>,
    artist: ArtistSummary
  ) => void;
}) {
  const { tr } = useI18n();
  if (artists.length === 0) {
    return <EmptyChartsState message={tr("Aucun DJ classé pour cette sélection.", "No ranked DJs for this selection.")} />;
  }

  const topThree = artists.slice(0, 3);
  const remaining = artists.slice(3);

  return (
    <div className="space-y-8">
      {/* ── Podium Top 3 DJs ──────────────────────────────────────── */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {topThree.map((artist, idx) => {
            const conf = PODIUM_CONFIG[idx];
            const Icon = conf.icon;
            const isMixPlaying =
              artist.topMix && currentTrackId === artist.topMix.id && isPlaying;

            return (
              <div
                key={artist.id}
                className={cn(
                  "relative flex flex-col justify-between p-6 rounded-3xl border transition-all duration-300 shadow-xl group",
                  conf.bgCard,
                  conf.borderCard,
                  idx === 0 && "md:-translate-y-2 md:shadow-amber-500/15"
                )}
              >
                {/* Header Rank Badge */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm",
                      conf.badgeBg
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 fill-current" />
                    <span>#{idx + 1}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-400 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06]">
                    <Headphones className="h-3 w-3 text-purple-400" />
                    <span>{formatCount(artist.monthlyPlays ?? 0)} {tr("écoutes", "plays")}</span>
                  </span>
                </div>

                {/* Avatar & DJ Info */}
                <Link
                  href={`/artists/${artist.slug}`}
                  className="flex flex-col items-center text-center my-3 group/link"
                >
                  <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full overflow-hidden bg-zinc-800 ring-4 ring-white/[0.08] group-hover/link:ring-purple-500/50 transition-all duration-300 shadow-2xl">
                    {artist.avatarUrl ? (
                      <Image
                        src={artist.avatarUrl}
                        alt={artist.stageName}
                        fill
                        className="object-cover group-hover/link:scale-105 transition-transform duration-500"
                        sizes="128px"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-pink-900 text-3xl">
                        <Headphones className="h-10 w-10 text-purple-300" />
                      </div>
                    )}
                    {artist.verified && (
                      <div className="absolute bottom-1 right-1 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center ring-4 ring-[#101218]">
                        <UserCheck className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-black text-white mt-3 truncate max-w-full group-hover/link:text-purple-300 transition-colors">
                    {artist.stageName}
                  </h3>

                  <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                    {artist.country || "Afrique"}
                    {artist.followerCount > 0 && ` • ${formatCount(artist.followerCount)} abonnés`}
                  </p>
                </Link>

                {/* Top Mix Button */}
                <div className="pt-3 border-t border-white/[0.06] mt-2">
                  {artist.topMix ? (
                    <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-colors">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block truncate">
                          {tr("Mix phare du moment", "Featured mix")}
                        </span>
                        <p className="text-xs font-semibold text-white truncate">
                          {artist.topMix.title}
                        </p>
                      </div>

                      <button
                        onClick={() => onPlayArtistMix(artist.topMix!, artist)}
                        className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 shadow-md",
                          isMixPlaying
                            ? "bg-purple-600 text-white scale-105"
                            : "bg-white text-black hover:scale-110 active:scale-95"
                        )}
                        aria-label={isMixPlaying ? "Pause" : "Écouter le mix"}
                      >
                        {isMixPlaying ? (
                          <Pause className="h-4 w-4 fill-current" />
                        ) : (
                          <Play className="h-4 w-4 ml-0.5 fill-current" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <Link
                      href={`/artists/${artist.slug}`}
                      className="block text-center py-2 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      {tr("Voir le profil →", "View profile →")}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Remaining DJs List (#4 to #50) ────────────────────────── */}
      {remaining.length > 0 && (
        <div className="rounded-3xl bg-[#0f1117] border border-white/[0.06] overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-400" />
              <span>{tr("Classement des DJs", "DJ chart")} (#4 {tr("à", "to")} #{artists.length})</span>
            </h3>
            <span className="text-xs text-zinc-400">{remaining.length} {tr("DJs répertoriés", "DJs listed")}</span>
          </div>

          <div className="divide-y divide-white/[0.03]">
            {remaining.map((artist, idx) => {
              const rank = idx + 4;
              const isMixPlaying =
                artist.topMix && currentTrackId === artist.topMix.id && isPlaying;

              return (
                <div
                  key={artist.id}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-white/[0.03] transition-colors"
                >
                  {/* Left: Rank + Avatar + Name */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="text-xs font-black text-zinc-500 w-6 text-center flex-shrink-0">
                      #{rank}
                    </span>

                    <Link href={`/artists/${artist.slug}`} className="relative h-12 w-12 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 ring-2 ring-white/[0.08]">
                      {artist.avatarUrl ? (
                        <Image
                          src={artist.avatarUrl}
                          alt={artist.stageName}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-sm">
                          <Headphones className="h-4 w-4 text-zinc-400" />
                        </div>
                      )}
                    </Link>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/artists/${artist.slug}`}
                          className="font-bold text-sm text-white hover:text-purple-300 transition-colors truncate"
                        >
                          {artist.stageName}
                        </Link>
                        {artist.verified && (
                          <UserCheck className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        {artist.country && <span>{artist.country}</span>}
                        {artist.followerCount > 0 && (
                          <span>• {formatCount(artist.followerCount)} {tr("abonnés", "followers")}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Plays count & Top Mix Play button */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold text-white">
                        {formatCount(artist.monthlyPlays ?? 0)}
                      </p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{tr("écoutes", "plays")}</p>
                    </div>

                    {artist.topMix && (
                      <button
                        onClick={() => onPlayArtistMix(artist.topMix!, artist)}
                        className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center transition-all",
                          isMixPlaying
                            ? "bg-purple-600 text-white"
                            : "bg-white/[0.08] text-white hover:bg-white hover:text-black"
                        )}
                        title={`Écouter : ${artist.topMix.title}`}
                      >
                        {isMixPlaying ? (
                          <Pause className="h-4 w-4 fill-current" />
                        ) : (
                          <Play className="h-4 w-4 fill-current ml-0.5" />
                        )}
                      </button>
                    )}

                    <Link
                      href={`/artists/${artist.slug}`}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 transition-colors hidden md:inline-block"
                    >
                      {tr("Profil", "Profile")}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tracks Chart Component ───────────────────────────────────────────
function TracksChart({
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  isLiked,
  onToggleLike,
  onAddToPlaylist,
}: {
  tracks: TrackSummary[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: TrackSummary) => void;
  isLiked: (id: string) => boolean;
  onToggleLike: (id: string) => void;
  onAddToPlaylist: (item: {
    id: string;
    type: "mix" | "track";
    title: string;
    coverUrl?: string | null;
    artistName?: string;
  }) => void;
}) {
  const { tr, language } = useI18n();
  if (tracks.length === 0) {
    return <EmptyChartsState message={tr("Aucun morceau classé pour cette sélection.", "No ranked tracks for this selection.")} />;
  }

  return (
    <div className="rounded-3xl bg-[#0f1117] border border-white/[0.06] overflow-hidden shadow-xl">
      <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Music2 className="h-4 w-4 text-purple-400" />
          <span>{tr("Top Morceaux AfroMix", "AfroMix Top Tracks")}</span>
        </h3>
        <span className="text-xs text-zinc-400">{tracks.length} {tr("titres classés", "ranked tracks")}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-zinc-500 border-b border-white/[0.04] bg-white/[0.01]">
            <tr>
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">{tr("Titre", "Title")}</th>
              <th className="py-3 px-4 hidden md:table-cell">Genre</th>
              <th className="py-3 px-4 hidden sm:table-cell">BPM</th>
              <th className="py-3 px-4 text-right">{tr("Écoutes", "Plays")}</th>
              <th className="py-3 px-4 hidden sm:table-cell text-right">{tr("Durée", "Duration")}</th>
              <th className="py-3 px-4 text-right w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {tracks.map((track, idx) => {
              const rank = idx + 1;
              const isCurrent = currentTrackId === track.id;
              const isPlayingThis = isCurrent && isPlaying;
              const liked = isLiked(track.id);

              return (
                <tr
                  key={track.id}
                  className={cn(
                    "group hover:bg-white/[0.04] transition-colors",
                    isCurrent && "bg-purple-950/20"
                  )}
                >
                  {/* Rank & Hover Play */}
                  <td className="py-3 px-4 text-center">
                    <div className="relative flex items-center justify-center h-8 w-8 mx-auto">
                      <span
                        className={cn(
                          "text-xs font-black text-zinc-500 group-hover:hidden",
                          rank <= 3 ? "text-amber-400 font-bold" : "",
                          isCurrent && "text-purple-400"
                        )}
                      >
                        {rank}
                      </span>
                      <button
                        onClick={() => onPlayTrack(track)}
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                          isPlayingThis
                            ? "bg-purple-600 text-white"
                            : "hidden group-hover:flex bg-white text-black hover:scale-105"
                        )}
                        aria-label={isPlayingThis ? "Pause" : "Écouter"}
                      >
                        {isPlayingThis ? (
                          <Pause className="h-3.5 w-3.5 fill-current" />
                        ) : (
                          <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Title & Artist */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-11 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0">
                        {track.coverUrl ? (
                          <Image
                            src={track.coverUrl}
                            alt={track.title}
                            fill
                            className="object-cover"
                            sizes="44px"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-sm">
                            <Music className="h-4 w-4 text-purple-400" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p
                          className={cn(
                            "font-bold truncate max-w-xs sm:max-w-md",
                            isCurrent ? "text-purple-400" : "text-white"
                          )}
                        >
                          {track.title}
                        </p>
                        {track.artist && (
                          <Link
                            href={`/artists/${track.artist.slug}`}
                            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors truncate block"
                          >
                            {track.artist.stageName}
                          </Link>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Genre */}
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="px-2.5 py-1 rounded-full bg-white/[0.04] text-xs text-zinc-300 border border-white/[0.05]">
                      {genreLabel(track.genre, language)}
                    </span>
                  </td>

                  {/* BPM */}
                  <td className="py-3 px-4 hidden sm:table-cell text-zinc-400 font-mono text-xs">
                    {track.bpm ? `${track.bpm} BPM` : "—"}
                  </td>

                  {/* Plays */}
                  <td className="py-3 px-4 text-right font-medium text-zinc-300">
                    {formatCount(track.playCount)}
                  </td>

                  {/* Duration */}
                  <td className="py-3 px-4 hidden sm:table-cell text-right font-mono text-zinc-400 text-xs">
                    {formatDuration(track.durationSec)}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() =>
                          onAddToPlaylist({
                            id: track.id,
                            type: "track",
                            title: track.title,
                            coverUrl: track.coverUrl,
                            artistName: track.artist?.stageName,
                          })
                        }
                        className="p-1 text-zinc-500 hover:text-purple-400 transition-colors"
                        title={tr("Ajouter à une playlist", "Add to a playlist")}
                      >
                        <ListPlus className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => onToggleLike(track.id)}
                        className={cn(
                          "p-1 transition-colors",
                          liked ? "text-pink-500" : "text-zinc-500 hover:text-pink-400"
                        )}
                        title={tr("J'aime", "Like")}
                      >
                        <Heart className={cn("h-4 w-4", liked && "fill-current")} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────────────
function EmptyChartsState({ message }: { message?: string }) {
  const { tr } = useI18n();
  return (
    <div className="text-center py-16 px-4 rounded-3xl bg-white/[0.02] border border-white/[0.06] space-y-3">
      <div className="h-16 w-16 mx-auto rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
        <TrendingUp className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold text-white">{tr("Aucun élément trouvé", "Nothing found")}</h3>
      <p className="text-sm text-zinc-400 max-w-sm mx-auto">
        {message || tr("Aucun mix ne correspond aux critères choisis. Essayez une autre période ou un autre genre.", "No mix matches your filters. Try another period or genre.")}
      </p>
    </div>
  );
}

// ── Chart Skeleton ───────────────────────────────────────────────────
function ChartSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-80 rounded-3xl bg-white/[0.03] animate-pulse" />
        ))}
      </div>
      <div className="h-96 rounded-3xl bg-white/[0.02] animate-pulse" />
    </div>
  );
}

// ── Page Root with Suspense boundary (required for useSearchParams) ──
export default function TrendingPage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <TrendingContent />
    </Suspense>
  );
}
