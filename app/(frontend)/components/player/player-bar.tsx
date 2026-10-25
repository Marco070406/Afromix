"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  Repeat1,
  Heart,
  ChevronUp,
  Maximize2,
  Share2,
  ListMusic,
  ListPlus,
  X,
  Music,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { usePlayer } from "@/app/(frontend)/providers/player-provider";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { FullscreenPlayer } from "@/app/(frontend)/components/player/fullscreen-player";
import { QueueDrawer } from "@/app/(frontend)/components/player/queue-drawer";
import { formatDuration } from "@/app/(frontend)/lib/utils";
import { cn } from "@/app/(frontend)/lib/utils";
import { useLikedMixIds } from "@/app/(frontend)/hooks/use-liked-mix-ids";
import { useAddToPlaylist } from "@/app/(frontend)/providers/playlist-modal-provider";

export function PlayerBar() {
  const {
    track, isPlaying, isLoading, currentTime, duration,
    volume, isMuted, isShuffled, repeatMode,
    togglePlay, seek, setVolume, toggleMute,
    next, prev, toggleShuffle, cycleRepeat,
    clearQueue,
  } = usePlayer();
  const { user } = useAuth();
  const { t, tr } = useI18n();
  const { isLiked, toggleLike, isPending: likePending } = useLikedMixIds();
  const { openAddToPlaylist } = useAddToPlaylist();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Expose la présence du lecteur : la zone de contenu réserve sa hauteur (--player-h)
  useEffect(() => {
    document.documentElement.dataset.player = track ? "on" : "off";
  }, [track]);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [desktopCoverErr, setDesktopCoverErr] = useState(false);
  const [mobileCoverErr, setMobileCoverErr] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const liked = isLiked(track?.id ?? "");

  const handleLike = () => {
    if (!user) { toast.error(t("player.loginToLike")); return; }
    if (!track || likePending) return;
    toggleLike(track.id);
  };

  const handleAddToPlaylist = () => {
    if (!track) return;
    openAddToPlaylist({
      id: track.id,
      type: track.type === "track" ? "track" : "mix",
      title: track.title,
      coverUrl: track.coverUrl,
      artistName: track.artist?.stageName,
    });
  };

  const handleShare = () => {
    if (!track) return;
    const url = `${window.location.origin}/mixes/${track.slug}`;
    if (navigator.share) {
      navigator.share({ title: track.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success(t("player.copied"));
    }
  };

  // ── Global keyboard shortcuts (desktop) ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Skip when focus is inside a text input or modal
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          if (track) togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (track) seek(Math.max(0, currentTime - 10));
          break;
        case "ArrowRight":
          e.preventDefault();
          if (track) seek(currentTime + 10);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
        case "q":
        case "Q":
          e.preventDefault();
          setIsQueueOpen((prev) => !prev);
          break;
        case "n":
        case "N":
          e.preventDefault();
          next();
          break;
        case "p":
        case "P":
          e.preventDefault();
          prev();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [track, togglePlay, seek, setVolume, toggleMute, currentTime, volume, next, prev]);

  if (!track) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    seek(pct * duration);
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setHoverTime(Math.max(0, pct * duration));
    setHoverX(e.clientX - rect.left);
  };

  return (
    <>
      {/* ── Desktop player (h-22, 3 columns) ── */}
      <div className="hidden lg:block fixed bottom-0 left-0 right-0 z-40 h-22 bg-bg/95 backdrop-blur-2xl border-t border-line">
        {/* Progress bar (clickable + tooltip) */}
        <div
          ref={progressBarRef}
          className="absolute top-0 left-0 right-0 h-1 bg-white/[0.08] cursor-pointer group hover:h-1.5 transition-all"
          onClick={handleProgressClick}
          onMouseMove={handleProgressHover}
          onMouseLeave={() => setHoverTime(null)}
        >
          <div
            className="h-full bg-brand-gradient relative transition-all"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
          </div>
          {/* Hover time tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-8 -translate-x-1/2 px-2 py-1 rounded-md bg-zinc-800 text-xs text-white shadow-lg pointer-events-none"
              style={{ left: `${hoverX}px` }}
            >
              {formatDuration(hoverTime)}
            </div>
          )}
        </div>

        <div className="h-full flex items-center justify-between gap-4 px-6">
          {/* Left Column: Track info */}
          <div className="flex items-center gap-3 w-[300px] min-w-0">
            <div
              onClick={() => setIsFullscreen(true)}
              className="relative h-13 w-13 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800 cursor-pointer group shadow-md"
            >
              {track.coverUrl && !desktopCoverErr ? (
                <Image src={track.coverUrl} alt={track.title} fill className="object-cover group-hover:scale-105 transition-transform" sizes="52px" onError={() => setDesktopCoverErr(true)} />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50">
                  <Music className="h-6 w-6 text-purple-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Maximize2 className="h-4 w-4" />
              </div>
            </div>
            <div className="min-w-0">
              <Link
                href={`/mixes/${track.slug}`}
                className="text-sm font-bold text-white truncate block hover:text-purple-400 transition-colors"
              >
                {track.title}
              </Link>
              {track.artist && (
                <Link
                  href={`/artists/${track.artist.slug}`}
                  className="text-xs text-zinc-400 truncate block hover:text-zinc-200 transition-colors mt-0.5"
                >
                  {track.artist.stageName}
                </Link>
              )}
            </div>
            <button
              onClick={handleLike}
              disabled={likePending}
              className={cn(
                "ml-1 p-1.5 rounded-full hover:bg-white/[0.06] flex-shrink-0 transition-colors",
                liked ? "text-pink-500" : "text-zinc-500 hover:text-pink-400"
              )}
              aria-label={liked ? "Retirer le like" : tr("J'aime", "Like")}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} />
            </button>
            <button
              onClick={handleAddToPlaylist}
              className="p-1.5 rounded-full hover:bg-white/[0.06] flex-shrink-0 text-zinc-500 hover:text-purple-400 transition-colors"
              title={tr("Ajouter à une playlist", "Add to a playlist")}
              aria-label={tr("Ajouter à une playlist", "Add to a playlist")}
            >
              <ListPlus className="h-4 w-4" />
            </button>
          </div>

          {/* Center Column: Controls */}
          <div className="flex-1 flex flex-col items-center gap-1.5 max-w-lg">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleShuffle}
                className={cn("p-1.5 rounded-full hover:bg-white/[0.06] transition-colors", isShuffled ? "text-purple-400" : "text-zinc-400 hover:text-white")}
                aria-label={tr("Lecture aléatoire", "Shuffle")}
              >
                <Shuffle className="h-4 w-4" />
              </button>

              <button onClick={prev} className="p-1 text-zinc-400 hover:text-white hover:scale-105 transition-all" aria-label={tr("Précédent", "Previous")}>
                <SkipBack className="h-5 w-5" />
              </button>

              <button
                onClick={togglePlay}
                disabled={isLoading}
                className="h-11 w-11 rounded-full bg-white hover:bg-zinc-100 flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50"
                aria-label={isPlaying ? "Pause" : "Lecture"}
              >
                {isLoading ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                ) : isPlaying ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5 fill-current" />
                )}
              </button>

              <button onClick={next} className="p-1 text-zinc-400 hover:text-white hover:scale-105 transition-all" aria-label={tr("Suivant", "Next")}>
                <SkipForward className="h-5 w-5" />
              </button>

              <button
                onClick={cycleRepeat}
                className={cn("p-1.5 rounded-full hover:bg-white/[0.06] transition-colors", repeatMode !== "none" ? "text-purple-400" : "text-zinc-400 hover:text-white")}
                aria-label={tr("Répétition", "Repeat")}
              >
                {repeatMode === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
              </button>
            </div>

            {/* Time readout */}
            <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-400">
              <span>{formatDuration(currentTime)}</span>
              <span>/</span>
              <span>{formatDuration(track.durationSec ?? duration)}</span>
            </div>
          </div>

          {/* Right Column: HQ, Queue, Share, Volume, Fullscreen */}
          <div className="flex items-center gap-3 w-[300px] justify-end">
            {/* HQ Badge */}
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 tracking-wider">
              HQ
            </span>

            {/* Queue Toggle button */}
            <button
              onClick={() => setIsQueueOpen((prev) => !prev)}
              className={cn(
                "transition-colors p-1.5 rounded-lg",
                isQueueOpen
                  ? "text-purple-400 bg-purple-600/20 border border-purple-500/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
              )}
              title={`${t("player.queue")} [Q]`}
              aria-label={t("player.queue")}
            >
              <ListMusic className="h-4 w-4" />
            </button>

            {/* Share button */}
            <button
              onClick={handleShare}
              className="text-zinc-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.06]"
              title={t("player.share")}
              aria-label={t("btn.share")}
            >
              <Share2 className="h-4 w-4" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1.5">
              <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors p-1">
                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-20 accent-purple-500 cursor-pointer h-1 bg-white/20 rounded-lg"
                aria-label="Volume"
              />
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={() => setIsFullscreen(true)}
              className="text-zinc-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.06]"
              title={t("player.fullscreen")}
              aria-label={t("player.fullscreen")}
            >
              <Maximize2 className="h-4 w-4" />
            </button>

            {/* Close / Dismiss Player */}
            <button
              onClick={clearQueue}
              className="text-zinc-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.08]"
              title={tr("Fermer le lecteur", "Close player")}
              aria-label={tr("Fermer le lecteur", "Close player")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile player (mini) ── */}
      <div className="lg:hidden fixed bottom-[var(--bottom-nav-h)] left-0 right-0 z-40">
        {/* Mobile progress bar */}
        <div
          className="h-0.5 bg-white/[0.08] cursor-pointer"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-brand-gradient"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-3 h-16 bg-surface/95 backdrop-blur-xl border-t border-line px-3">
          {/* Cover & Info (click to open fullscreen) */}
          <div
            onClick={() => setIsFullscreen(true)}
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer active:opacity-80"
          >
            <div className="relative h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
              {track.coverUrl && !mobileCoverErr ? (
                <Image src={track.coverUrl} alt={track.title} fill className="object-cover" sizes="40px" onError={() => setMobileCoverErr(true)} />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50">
                  <Music className="h-5 w-5 text-purple-300" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{track.title}</p>
              {track.artist && (
                <p className="text-xs text-zinc-500 truncate">{track.artist.stageName}</p>
              )}
            </div>

            <ChevronUp className="h-4 w-4 text-zinc-500 flex-shrink-0" />
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleLike}
              className={cn(
                "h-9 w-9 flex items-center justify-center rounded-full transition-colors",
                liked ? "text-pink-500" : "text-zinc-500"
              )}
              aria-label={tr("J'aime", "Like")}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} />
            </button>

            <button
              onClick={togglePlay}
              disabled={isLoading}
              className="h-9 w-9 rounded-full bg-white flex items-center justify-center text-black disabled:opacity-50"
              aria-label={isPlaying ? "Pause" : "Lecture"}
            >
              {isLoading ? (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </button>

            <button onClick={next} className="h-9 w-9 flex items-center justify-center text-zinc-400" aria-label={tr("Suivant", "Next")}>
              <SkipForward className="h-4 w-4" />
            </button>

            <button
              onClick={clearQueue}
              className="h-9 w-9 flex items-center justify-center text-zinc-500 hover:text-white"
              aria-label={tr("Fermer le lecteur", "Close player")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Fullscreen modal ── */}
      <FullscreenPlayer
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        liked={liked}
        onToggleLike={handleLike}
        onAddToPlaylist={handleAddToPlaylist}
      />

      {/* ── Queue Drawer ── */}
      <QueueDrawer
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
      />
    </>
  );
}
