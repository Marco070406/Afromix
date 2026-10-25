"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Trophy,
  Crown,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Flame,
  UserCheck,
} from "lucide-react";
import type { ArtistSummary } from "@/types/api";
import { usePlayer, type PlayerTrack } from "@/app/(frontend)/providers/player-provider";
import { formatCount, cn } from "@/app/(frontend)/lib/utils";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

interface TopMonthlyDjsProps {
  artists: ArtistSummary[];
  isLoading?: boolean;
}

const PODIUM_RANKS = [
  {
    rank: 1,
    badgeBg: "bg-gradient-to-r from-amber-500/25 to-yellow-500/25 border-amber-400/50 text-amber-300",
    glow: "border-gold/30 hover:border-gold/60",
    icon: Crown,
    iconColor: "text-amber-400",
  },
  {
    rank: 2,
    badgeBg: "bg-gradient-to-r from-slate-300/25 to-zinc-400/25 border-slate-300/50 text-slate-200",
    glow: "border-slate-400/20 hover:border-slate-300/50",
    icon: Trophy,
    iconColor: "text-slate-300",
  },
  {
    rank: 3,
    badgeBg: "bg-gradient-to-r from-amber-700/25 to-orange-600/25 border-amber-700/50 text-amber-400",
    glow: "border-amber-700/25 hover:border-amber-600/50",
    icon: Trophy,
    iconColor: "text-amber-500",
  },
  {
    rank: 4,
    badgeBg: "bg-white/[0.05] border-line-strong text-zinc-300",
    glow: "border-line hover:border-line-strong",
    icon: Flame,
    iconColor: "text-muted",
  },
  {
    rank: 5,
    badgeBg: "bg-white/[0.05] border-line-strong text-zinc-300",
    glow: "border-line hover:border-line-strong",
    icon: Flame,
    iconColor: "text-muted",
  },
];

function DjCard({
  artist,
  rankIndex,
}: {
  artist: ArtistSummary;
  rankIndex: number;
}) {
  const { tr } = useI18n();
  const { play, track: currentTrack, isPlaying, togglePlay } = usePlayer();
  const [imgErr, setImgErr] = useState(false);
  const config = PODIUM_RANKS[rankIndex] ?? PODIUM_RANKS[4];
  const RankIcon = config.icon;

  const isCurrentMixPlaying =
    artist.topMix && currentTrack?.id === artist.topMix.id && isPlaying;

  const handlePlayTopMix = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!artist.topMix || !artist.topMix.audioUrl) return;

    if (currentTrack?.id === artist.topMix.id) {
      togglePlay();
    } else {
      const pt: PlayerTrack = {
        id: artist.topMix.id,
        slug: artist.topMix.slug,
        title: artist.topMix.title,
        audioUrl: artist.topMix.audioUrl,
        coverUrl: artist.topMix.coverUrl || artist.avatarUrl,
        durationSec: artist.topMix.durationSec,
        artist: {
          id: artist.id,
          slug: artist.slug,
          stageName: artist.stageName,
          avatarUrl: artist.avatarUrl,
        },
        type: "mix",
      };
      play(pt);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between p-5 rounded-2xl bg-surface border transition-all duration-300 hover:-translate-y-1 w-[260px] sm:w-[280px] md:w-[300px] flex-shrink-0 snap-start select-none",
        config.glow
      )}
    >
      {/* Top row: Rank badge & Listeners count */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border shadow-sm",
            config.badgeBg
          )}
        >
          <RankIcon className={cn("h-3.5 w-3.5", config.iconColor)} />
          <span>#{rankIndex + 1}</span>
        </span>

        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted px-1 py-1 tabular-nums">
          <Headphones className="h-3 w-3 text-subtle" />
          <span>{formatCount(artist.monthlyPlays ?? 0)} {tr("écoutes", "plays")}</span>
        </span>
      </div>

      {/* Center: DJ Avatar with glowing ring */}
      <Link href={`/artists/${artist.slug}`} className="flex flex-col items-center text-center my-2 group/avatar">
        <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full overflow-hidden bg-surface-3 ring-4 ring-line group-hover/avatar:ring-brand/50 transition-all duration-300">
          {artist.avatarUrl && !imgErr ? (
            <Image
              src={artist.avatarUrl}
              alt={artist.stageName}
              fill
              className="object-cover group-hover/avatar:scale-105 transition-transform duration-500"
              sizes="128px"
              onError={() => setImgErr(true)}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-surface-3">
              <Headphones className="h-10 w-10 text-subtle" />
            </div>
          )}

          {artist.verified && (
            <div className="absolute bottom-1 right-1 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center ring-4 ring-surface">
              <UserCheck className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        <h3 className="text-lg font-bold text-white mt-3 truncate max-w-full">
          {artist.stageName}
        </h3>

        <p className="text-xs text-muted mt-0.5">
          {artist.country || tr("Artiste AfroMix", "AfroMix artist")}
          {artist.followerCount > 0 && ` • ${formatCount(artist.followerCount)} followers`}
        </p>
      </Link>

      {/* Bottom: Most popular mix this month & Play button */}
      <div className="mt-4 pt-3.5 border-t border-line">
        {artist.topMix ? (
          <div className="flex items-center justify-between gap-2.5 bg-surface-2 hover:bg-surface-3 p-2 pl-3 rounded-xl transition-colors">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle block truncate">
                {tr("Mix phare du mois", "Featured mix of the month")}
              </span>
              <p className="text-xs font-semibold text-white truncate">
                {artist.topMix.title}
              </p>
            </div>

            <button
              onClick={handlePlayTopMix}
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 shadow-md",
                isCurrentMixPlaying
                  ? "bg-brand-gradient text-white scale-105"
                  : "bg-white text-black hover:scale-110 active:scale-95"
              )}
              aria-label={isCurrentMixPlaying ? "Pause" : tr("Écouter le mix", "Play the mix")}
              title={tr("Écouter le mix", "Play the mix")}
            >
              {isCurrentMixPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 ml-0.5 fill-current" />
              )}
            </button>
          </div>
        ) : (
          <Link
            href={`/artists/${artist.slug}`}
            className="block text-center py-2 text-xs font-semibold text-muted hover:text-white transition-colors"
          >
            {tr("Découvrir l&apos;univers du DJ →", "Discover the DJ's world →")}
          </Link>
        )}
      </div>
    </div>
  );
}

export function TopMonthlyDjs({ artists, isLoading }: TopMonthlyDjsProps) {
  const { tr } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const topFive = artists.slice(0, 5);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [topFive]);

  // Gentle auto-scrolling loop (pauses when user hovers)
  useEffect(() => {
    if (isHovered || topFive.length <= 1) return;

    const interval = setInterval(() => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      if (scrollLeft + clientWidth >= scrollWidth - 20) {
        scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollRef.current.scrollBy({ left: 290, behavior: "smooth" });
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [isHovered, topFive.length]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const offset = direction === "left" ? -300 : 300;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-60 rounded-xl bg-surface animate-pulse" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-72 w-[270px] rounded-2xl bg-surface animate-pulse flex-shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  if (topFive.length === 0) return null;

  return (
    <section className="relative space-y-5">
      {/* Header with Title and Scroll Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-gold text-[11px] font-semibold uppercase tracking-[0.12em]">
              <Trophy className="h-3.5 w-3.5" />
              {tr("Classement Officiel", "Official Chart")}
            </span>
            <span className="text-xs text-subtle">{tr("• Ce mois-ci", "• This month")}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {tr("Top 5 des DJs les plus écoutés du mois", "Top 5 most-played DJs this month")}
          </h2>
        </div>

        {/* Navigation arrows */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <Link
            href="/artists"
            className="text-sm font-medium text-muted hover:text-white transition-colors mr-2 hidden md:inline-block"
          >
            {tr("Tous les artistes →", "All artists →")}
          </Link>

          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="h-9 w-9 rounded-full bg-surface-2 hover:bg-surface-3 disabled:opacity-30 disabled:pointer-events-none text-white flex items-center justify-center transition-colors border border-line"
            aria-label={tr("DJs précédents", "Previous DJs")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="h-9 w-9 rounded-full bg-surface-2 hover:bg-surface-3 disabled:opacity-30 disabled:pointer-events-none text-white flex items-center justify-center transition-colors border border-line"
            aria-label={tr("DJs suivants", "Next DJs")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel with Smooth Snapping */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {topFive.map((artist, idx) => (
          <DjCard key={artist.id} artist={artist} rankIndex={idx} />
        ))}
      </div>
    </section>
  );
}
