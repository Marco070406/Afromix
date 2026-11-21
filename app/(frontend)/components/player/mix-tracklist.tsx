"use client";

import { useEffect, useRef } from "react";
import { AudioLines, Play } from "lucide-react";
import { toast } from "sonner";
import { usePlayer, type PlayerTrack } from "@/app/(frontend)/providers/player-provider";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { cn } from "@/app/(frontend)/lib/utils";
import type { MixDetail, TracklistEntry } from "@/types/api";

type TracklistMix = Pick<MixDetail, "id" | "slug" | "title" | "audioUrl" | "coverUrl" | "durationSec" | "artist" | "tracklist">;

/** Horodatage « 1:02:05 » ou « 12:30 », y compris « 0:00 » (formatDuration affiche « --:-- » pour 0). */
export function timestamp(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Index du morceau joué à l'instant `time` : le dernier dont le début est atteint, ou -1. */
export function currentEntryIndex(entries: TracklistEntry[], time: number): number {
  let index = -1;
  entries.forEach((entry, i) => {
    if (entry.startSec != null && entry.startSec <= time + 0.5) index = i;
  });
  return index;
}

interface MixTracklistProps {
  mix: TracklistMix;
  /** Garde le morceau en cours visible dans une liste qui défile (lecteur plein écran) */
  followCurrent?: boolean;
  className?: string;
}

/**
 * Tracklist cliquable : un morceau horodaté lance le mix à cet instant, ou y saute
 * si le mix est déjà en lecture. Le morceau en cours est mis en évidence.
 */
export function MixTracklist({ mix, followCurrent = false, className }: MixTracklistProps) {
  const { tr } = useI18n();
  const { track, isPlaying, currentTime, play, seek, resume } = usePlayer();
  const isCurrentMix = track?.id === mix.id;
  const activeIndex = isCurrentMix ? currentEntryIndex(mix.tracklist, currentTime) : -1;
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (followCurrent && activeIndex >= 0) activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [followCurrent, activeIndex]);

  const playFrom = (sec: number) => {
    if (isCurrentMix) {
      seek(sec);
      if (!isPlaying) resume();
      return;
    }
    if (!mix.audioUrl) {
      toast.error(tr("L'audio de ce mix n'est pas encore disponible", "This mix's audio isn't available yet"));
      return;
    }
    const playerTrack: PlayerTrack = {
      id: mix.id, slug: mix.slug, title: mix.title, audioUrl: mix.audioUrl,
      coverUrl: mix.coverUrl, durationSec: mix.durationSec, artist: mix.artist, type: "mix",
    };
    play(playerTrack, undefined, sec);
  };

  if (mix.tracklist.length === 0) {
    return <p className="text-sm text-zinc-500 py-4">{tr("Pas de tracklist disponible pour ce mix.", "No tracklist available for this mix.")}</p>;
  }

  return (
    <ol className={cn("space-y-1", className)}>
      {mix.tracklist.map((entry, i) => {
        const active = i === activeIndex;
        const start = entry.startSec;
        const content = (
          <>
            <span className="w-6 flex-shrink-0 flex justify-end text-xs text-zinc-600">
              {active ? (
                <AudioLines className={cn("h-4 w-4 text-purple-400", isPlaying && "animate-pulse")} aria-hidden />
              ) : (
                <>
                  <span className={cn(start != null && "group-hover:hidden")}>{i + 1}</span>
                  {start != null && <Play className="h-3.5 w-3.5 hidden group-hover:block text-white fill-current" aria-hidden />}
                </>
              )}
            </span>
            <span className="flex-1 min-w-0">
              <span className={cn("block text-sm truncate", active ? "text-purple-300 font-semibold" : "text-white")}>{entry.title}</span>
              <span className="block text-xs text-zinc-500 truncate">{entry.artist.stageName}</span>
            </span>
            {start != null && (
              <span className={cn("text-xs tabular-nums flex-shrink-0 transition-colors", active ? "text-purple-300" : "text-zinc-500 group-hover:text-purple-400")}>
                {timestamp(start)}
              </span>
            )}
          </>
        );

        return (
          <li key={entry.id}>
            {start != null ? (
              <button
                type="button"
                ref={active ? activeRef : undefined}
                onClick={() => playFrom(start)}
                aria-current={active ? "true" : undefined}
                aria-label={tr(`Écouter à partir de ${timestamp(start)} : ${entry.title}`, `Play from ${timestamp(start)}: ${entry.title}`)}
                className={cn(
                  "group w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors",
                  active ? "bg-purple-500/15" : "hover:bg-white/[0.05]"
                )}
              >
                {content}
              </button>
            ) : (
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl">{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Morceau en cours d'un mix, pour l'afficher sous le titre du lecteur. */
export function useCurrentTracklistEntry(mix: Pick<MixDetail, "id" | "tracklist"> | undefined): TracklistEntry | null {
  const { track, currentTime } = usePlayer();
  if (!mix || track?.id !== mix.id) return null;
  const index = currentEntryIndex(mix.tracklist, currentTime);
  return index >= 0 ? mix.tracklist[index] : null;
}
