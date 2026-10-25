"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  Heart,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  ListMusic,
  ListPlus,
  Music,
  Disc3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "@/app/(frontend)/providers/player-provider";
import { formatDuration, cn } from "@/app/(frontend)/lib/utils";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

interface FullscreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  liked: boolean;
  onToggleLike: () => void;
  onAddToPlaylist?: () => void;
}

export function FullscreenPlayer({
  isOpen,
  onClose,
  liked,
  onToggleLike,
  onAddToPlaylist,
}: FullscreenPlayerProps) {
  const { tr } = useI18n();
  const {
    track, queue, queueIndex, isPlaying, isLoading,
    currentTime, duration, volume, isMuted, isShuffled, repeatMode,
    togglePlay, seek, setVolume, toggleMute, next, prev,
    toggleShuffle, cycleRepeat, play,
  } = usePlayer();

  const [activeTab, setActiveTab] = useState<"player" | "queue">("player");
  const [artworkErr, setArtworkErr] = useState(false);
  const [bgErr, setBgErr] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!track) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(pct * duration);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
          drag="y"
          dragDirectionLock
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.05, bottom: 0.7 }}
          onDragEnd={(_e, info) => {
            if (info.offset.y > 100 || info.velocity.y > 400) {
              onClose();
            }
          }}
          className="fixed inset-0 z-[100] flex flex-col bg-[#07080c] text-white overflow-hidden select-none touch-none"
        >
          {/* Mobile drag handle pill */}
          <div className="sm:hidden w-12 h-1.5 bg-white/20 hover:bg-white/40 rounded-full mx-auto mt-3 -mb-1 flex-shrink-0 cursor-grab active:cursor-grabbing z-20" />

          {/* Ambient blurred backdrop */}
          {track.coverUrl && !bgErr ? (
            <div className="absolute inset-0 pointer-events-none opacity-30 blur-3xl scale-125 transform">
              <Image
                src={track.coverUrl}
                alt=""
                fill
                className="object-cover"
                priority
                onError={() => setBgErr(true)}
              />
            </div>
          ) : (
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-purple-900/30 via-pink-900/20 to-black/90" />
          )}

          {/* Dark overlay for contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#07080c]/80 to-[#07080c] pointer-events-none" />

          {/* Top navigation bar */}
          <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
              aria-label={tr("Réduire", "Minimise")}
            >
              <ChevronDown className="h-6 w-6" />
            </button>

            <div className="text-center">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                {tr("En cours de lecture", "Now playing")}
              </span>
              <p className="text-xs text-zinc-500 font-medium truncate max-w-[200px] sm:max-w-xs">
                AfroMix Live Player
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab(activeTab === "player" ? "queue" : "player")}
                className={cn(
                  "h-10 px-3 rounded-full flex items-center gap-1.5 text-xs font-medium transition-colors border",
                  activeTab === "queue"
                    ? "bg-purple-600/30 border-purple-500/50 text-purple-300"
                    : "bg-white/[0.08] border-transparent text-zinc-300 hover:text-white"
                )}
                aria-label={tr("File d'attente", "Queue")}
              >
                <ListMusic className="h-4 w-4" />
                <span className="hidden sm:inline">{tr("File", "Queue")}</span>
                {queue.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px]">
                    {queue.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="relative z-10 flex-1 overflow-y-auto px-6 py-6 flex flex-col items-center justify-center max-w-xl mx-auto w-full">
            {activeTab === "player" ? (
              <div className="w-full flex flex-col items-center justify-between h-full max-h-[700px]">
                {/* Artwork */}
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 my-auto rounded-3xl overflow-hidden shadow-2xl shadow-purple-950/40 border border-white/10 group">
                  {track.coverUrl && !artworkErr ? (
                    <Image
                      src={track.coverUrl}
                      alt={track.title}
                      fill
                      className={cn(
                        "object-cover transition-transform duration-700",
                        isPlaying ? "scale-100" : "scale-95 opacity-90"
                      )}
                      sizes="(max-width: 640px) 256px, (max-width: 768px) 320px, 384px"
                      priority
                      onError={() => setArtworkErr(true)}
                    />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-pink-900">
                      <Disc3 className={cn("h-24 w-24 text-white/40", isPlaying && "animate-spin-slow")} />
                    </div>
                  )}

                  {/* Glass highlight effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10 pointer-events-none" />
                </div>

                {/* Track Details & Like */}
                <div className="w-full flex items-center justify-between gap-4 mt-6 mb-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/mixes/${track.slug}`}
                      onClick={onClose}
                      className="text-xl sm:text-2xl font-bold text-white truncate block hover:text-purple-400 transition-colors"
                    >
                      {track.title}
                    </Link>
                    {track.artist && (
                      <Link
                        href={`/artists/${track.artist.slug}`}
                        onClick={onClose}
                        className="text-sm sm:text-base text-zinc-400 truncate block hover:text-zinc-200 transition-colors mt-0.5"
                      >
                        {track.artist.stageName}
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {onAddToPlaylist && (
                      <button
                        onClick={onAddToPlaylist}
                        className="h-12 w-12 rounded-full flex items-center justify-center transition-all text-zinc-400 hover:text-purple-300 bg-white/[0.06] hover:bg-white/[0.10]"
                        aria-label={tr("Ajouter à une playlist", "Add to a playlist")}
                        title={tr("Ajouter à une playlist", "Add to a playlist")}
                      >
                        <ListPlus className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={onToggleLike}
                      className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center transition-all",
                        liked
                          ? "text-pink-500 bg-pink-500/10 scale-105"
                          : "text-zinc-400 hover:text-pink-400 bg-white/[0.06] hover:bg-white/[0.10]"
                      )}
                      aria-label={liked ? tr("Retirer des favoris", "Remove from favourites") : tr("Ajouter aux favoris", "Add to favourites")}
                    >
                      <Heart className={cn("h-6 w-6", liked && "fill-current")} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full space-y-2 mt-2">
                  <div
                    ref={progressBarRef}
                    className="relative h-2 bg-white/[0.12] rounded-full cursor-pointer group"
                    onClick={handleProgressClick}
                  >
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 rounded-full relative transition-all"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white shadow-md scale-0 group-hover:scale-100 transition-transform" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(track.durationSec ?? duration)}</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="w-full flex items-center justify-between mt-6 px-4">
                  <button
                    onClick={toggleShuffle}
                    className={cn(
                      "h-10 w-10 flex items-center justify-center rounded-full transition-colors",
                      isShuffled ? "text-purple-400 bg-purple-500/10" : "text-zinc-400 hover:text-white"
                    )}
                    aria-label={tr("Lecture aléatoire", "Shuffle")}
                  >
                    <Shuffle className="h-5 w-5" />
                  </button>

                  <button
                    onClick={prev}
                    className="h-12 w-12 flex items-center justify-center text-zinc-300 hover:text-white hover:scale-110 active:scale-95 transition-all"
                    aria-label={tr("Piste précédente", "Previous track")}
                  >
                    <SkipBack className="h-7 w-7" />
                  </button>

                  <button
                    onClick={togglePlay}
                    disabled={isLoading}
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-xl shadow-purple-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    aria-label={isPlaying ? "Pause" : "Lecture"}
                  >
                    {isLoading ? (
                      <svg className="h-7 w-7 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                    ) : isPlaying ? (
                      <Pause className="h-8 w-8" />
                    ) : (
                      <Play className="h-8 w-8 ml-1 fill-current" />
                    )}
                  </button>

                  <button
                    onClick={next}
                    className="h-12 w-12 flex items-center justify-center text-zinc-300 hover:text-white hover:scale-110 active:scale-95 transition-all"
                    aria-label={tr("Piste suivante", "Next track")}
                  >
                    <SkipForward className="h-7 w-7" />
                  </button>

                  <button
                    onClick={cycleRepeat}
                    className={cn(
                      "h-10 w-10 flex items-center justify-center rounded-full transition-colors",
                      repeatMode !== "none" ? "text-purple-400 bg-purple-500/10" : "text-zinc-400 hover:text-white"
                    )}
                    aria-label={tr("Répétition", "Repeat")}
                  >
                    {repeatMode === "one" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                  </button>
                </div>

                {/* Volume slider */}
                <div className="w-full flex items-center justify-center gap-3 mt-6 pt-4 border-t border-white/[0.06] max-w-xs">
                  <button
                    onClick={toggleMute}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                    aria-label="Volume"
                  />
                </div>
              </div>
            ) : (
              /* Queue list */
              <div className="w-full h-full flex flex-col">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
                  <h3 className="text-lg font-bold text-white">{tr("File d'attente", "Queue")} ({queue.length})</h3>
                  <button
                    onClick={() => setActiveTab("player")}
                    className="text-xs text-purple-400 hover:underline"
                  >
                    {tr("Retour au player", "Back to player")}
                  </button>
                </div>

                {queue.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-sm py-12">
                    <Music className="h-10 w-10 mb-2 opacity-30" />
                    {tr("Aucun titre suivant dans la file", "Nothing next in the queue")}
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto max-h-[60vh] pr-2">
                    {queue.map((item, idx) => {
                      const isCurrent = idx === queueIndex;
                      return (
                        <div
                          key={`${item.id}-${idx}`}
                          onClick={() => play(item, queue)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border",
                            isCurrent
                              ? "bg-purple-600/20 border-purple-500/40 text-purple-200"
                              : "bg-white/[0.03] border-transparent hover:bg-white/[0.06] text-white"
                          )}
                        >
                          <div className="relative h-12 w-12 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                            {item.coverUrl ? (
                              <Image src={item.coverUrl} alt={item.title} fill className="object-cover" sizes="48px" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-purple-900/30 text-xs">
                                <Music className="h-4 w-4 text-purple-300" />
                              </div>
                            )}
                            {isCurrent && isPlaying && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-purple-400">
                                <Disc3 className="h-5 w-5 animate-spin-slow" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{item.title}</p>
                            <p className="text-xs text-zinc-400 truncate mt-0.5">{item.artist.stageName}</p>
                          </div>

                          {item.durationSec && (
                            <span className="text-xs text-zinc-500 flex-shrink-0">
                              {formatDuration(item.durationSec)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
