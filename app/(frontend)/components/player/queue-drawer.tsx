"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ListMusic,
  X,
  Play,
  Pause,
  Trash2,
  Keyboard,
  Disc3,
  ArrowRight,
  Music,
} from "lucide-react";
import { usePlayer } from "@/app/(frontend)/providers/player-provider";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { formatDuration } from "@/app/(frontend)/lib/utils";

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QueueDrawer({ isOpen, onClose }: QueueDrawerProps) {
  const {
    track,
    queue,
    queueIndex,
    isPlaying,
    jumpToQueueIndex,
    removeFromQueue,
    clearQueue,
    togglePlay,
  } = usePlayer();
  const { language, tr } = useI18n();

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Split queue into: current, upcoming, and past
  const currentTrack = track;
  const upcomingTracks = queue.slice(queueIndex + 1);
  const previousTracks = queue.slice(0, queueIndex);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0e1017]/95 backdrop-blur-2xl border-l border-white/[0.08] shadow-2xl flex flex-col h-full animate-slide-left">
          {/* Header */}
          <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <ListMusic className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{language === "fr" ? "File d'attente" : "Listening Queue"}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-300 font-mono">
                    {queue.length}
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">
                  {language === "fr" ? "Contrôle des prochains morceaux" : "Upcoming tracks"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={clearQueue}
                  className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title={language === "fr" ? "Vider la file" : "Clear queue"}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                title={language === "fr" ? "Fermer" : "Close"}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Keyboard shortcuts reminder banner */}
          <div className="px-5 py-3 bg-purple-950/20 border-b border-purple-500/20 text-xs text-zinc-300 flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-purple-400 flex-shrink-0" />
            <div className="flex-1 truncate">
              <span className="font-semibold text-purple-300">{tr("Raccourcis :", "Shortcuts:")}</span>{" "}
              <span className="text-zinc-400">
                {tr(
                  "[Espace] Lecture/Pause · [←/→] ±10s · [↑/↓] Volume · [M] Muet · [Q] File",
                  "[Space] Play/Pause · [←/→] ±10s · [↑/↓] Volume · [M] Mute · [Q] Queue"
                )}
              </span>
            </div>
          </div>

          {/* Queue Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* 1. Now Playing */}
            {currentTrack ? (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                  <span>{language === "fr" ? "En cours de lecture" : "Now Playing"}</span>
                </p>

                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-transparent border border-purple-500/30 shadow-lg shadow-purple-950/20 group">
                  <div className="relative h-13 w-13 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800 shadow-md">
                    {currentTrack.coverUrl ? (
                      <Image
                        src={currentTrack.coverUrl}
                        alt={currentTrack.title}
                        fill
                        className="object-cover"
                        sizes="52px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-purple-900/40 text-lg">
                        <Music className="h-5 w-5 text-purple-300" />
                      </div>
                    )}

                    <button
                      onClick={togglePlay}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center text-white transition-opacity"
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5 fill-current text-purple-300" />
                      ) : (
                        <Play className="h-5 w-5 fill-current text-white ml-0.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{currentTrack.title}</p>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {currentTrack.artist?.stageName}
                    </p>
                    <span className="inline-block text-[10px] px-2 py-0.5 mt-1 rounded bg-purple-500/20 text-purple-300 font-semibold uppercase">
                      {currentTrack.type === "mix" ? "Mix DJ" : "Track"}
                    </span>
                  </div>

                  {currentTrack.durationSec && (
                    <span className="text-xs text-zinc-400 font-mono flex-shrink-0 pr-1">
                      {formatDuration(currentTrack.durationSec)}
                    </span>
                  )}
                </div>
              </div>
            ) : null}

            {/* 2. Upcoming Tracks (À suivre) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  {language === "fr"
                    ? `À suivre (${upcomingTracks.length})`
                    : `Next in queue (${upcomingTracks.length})`}
                </p>
              </div>

              {upcomingTracks.length === 0 ? (
                <div className="py-8 px-4 rounded-2xl border border-dashed border-white/10 text-center space-y-2">
                  <Disc3 className="h-8 w-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400">
                    {language === "fr"
                      ? tr("Aucun morceau en attente dans la file.", "Nothing waiting in the queue.")
                      : "No upcoming tracks in the queue."}
                  </p>
                  <Link
                    href="/explore"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-bold pt-1"
                  >
                    <span>{language === "fr" ? "Explorer d'autres mixes" : "Explore mixes"}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {upcomingTracks.map((item, idx) => {
                    const realIndex = queueIndex + 1 + idx;
                    return (
                      <div
                        key={`${item.id}-${realIndex}`}
                        className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.05] transition-colors border border-transparent hover:border-white/[0.06]"
                      >
                        <span className="w-5 text-xs font-bold text-zinc-500 text-center flex-shrink-0">
                          {idx + 1}
                        </span>

                        <div
                          onClick={() => jumpToQueueIndex(realIndex)}
                          className="relative h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800 cursor-pointer shadow-sm"
                        >
                          {item.coverUrl ? (
                            <Image
                              src={item.coverUrl}
                              alt={item.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                              sizes="40px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs">
                              <Music className="h-4 w-4 text-purple-400" />
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <Play className="h-4 w-4 fill-current ml-0.5" />
                          </div>
                        </div>

                        <div
                          onClick={() => jumpToQueueIndex(realIndex)}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <p className="text-sm font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                            {item.title}
                          </p>
                          <p className="text-xs text-zinc-400 truncate">{item.artist?.stageName}</p>
                        </div>

                        {item.durationSec && (
                          <span className="text-xs text-zinc-500 font-mono flex-shrink-0">
                            {formatDuration(item.durationSec)}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => removeFromQueue(realIndex)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={language === "fr" ? "Retirer de la file" : "Remove"}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Previously played in queue (Précédents) */}
            {previousTracks.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-white/[0.06]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  {language === "fr"
                    ? `Écoutés précédemment (${previousTracks.length})`
                    : `Previously played (${previousTracks.length})`}
                </p>

                <div className="space-y-1">
                  {previousTracks.map((item, idx) => (
                    <div
                      key={`prev-${item.id}-${idx}`}
                      onClick={() => jumpToQueueIndex(idx)}
                      className="group flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer opacity-60 hover:opacity-100"
                    >
                      <div className="relative h-8 w-8 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                        {item.coverUrl ? (
                          <Image src={item.coverUrl} alt={item.title} fill className="object-cover" sizes="32px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs">
                            <Music className="h-3.5 w-3.5 text-zinc-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{item.artist?.stageName}</p>
                      </div>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {item.durationSec ? formatDuration(item.durationSec) : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
