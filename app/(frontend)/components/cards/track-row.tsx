"use client";

import Link from "next/link";
import Image from "next/image";
import { Play, Pause, Heart, ListPlus, Music } from "lucide-react";
import type { TrackSummary } from "@/types/api";
import { usePlayer, type PlayerTrack } from "@/app/(frontend)/providers/player-provider";
import { useLikedMixIds } from "@/app/(frontend)/hooks/use-liked-mix-ids";
import { useAddToPlaylist } from "@/app/(frontend)/providers/playlist-modal-provider";
import { formatDuration, genreLabel, cn } from "@/app/(frontend)/lib/utils";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

interface TrackRowProps {
  track: TrackSummary;
  index?: number;
  showArtist?: boolean;
  onTimestampClick?: (seconds: number) => void;
}

function trackToPlayerTrack(t: TrackSummary): PlayerTrack | null {
  if (!t.audioUrl || !t.artist) return null;
  return {
    id: t.id, slug: t.slug, title: t.title,
    audioUrl: t.audioUrl, coverUrl: t.coverUrl, durationSec: t.durationSec,
    artist: t.artist, type: "track",
  };
}

export function TrackRow({ track, index, showArtist = true }: TrackRowProps) {
  const { tr, language } = useI18n();
  const { play, track: currentTrack, isPlaying, togglePlay } = usePlayer();
  const { isLiked, toggleLike, isPending } = useLikedMixIds();
  const { openAddToPlaylist } = useAddToPlaylist();
  const liked = isLiked(track.id);
  const isCurrentTrack = currentTrack?.id === track.id;

  const handlePlay = () => {
    const pt = trackToPlayerTrack(track);
    if (!pt) return;
    if (isCurrentTrack) togglePlay();
    else play(pt);
  };

  return (
    <div className={cn(
      "group flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer",
      isCurrentTrack && "bg-white/[0.04]"
    )}>
      {/* Index / Play button */}
      <div className="w-6 flex-shrink-0 flex items-center justify-center">
        {isCurrentTrack && isPlaying ? (
          <button onClick={handlePlay} className="text-purple-400">
            <Pause className="h-4 w-4" />
          </button>
        ) : (
          <>
            <span className={cn("text-xs text-zinc-600 group-hover:hidden", !index && "hidden")}>
              {index}
            </span>
            <button
              onClick={handlePlay}
              className={cn("text-white", index ? "hidden group-hover:block" : "block")}
              aria-label={tr("Lire", "Play")}
            >
              <Play className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Cover */}
      <div className="relative h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
        {track.coverUrl ? (
          <Image src={track.coverUrl} alt={track.title} fill className="object-cover" sizes="40px" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-base">
            <Music className="h-4 w-4 text-purple-400" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", isCurrentTrack ? "text-purple-400" : "text-white")}>
          {track.title}
        </p>
        {showArtist && track.artist && (
          <Link href={`/artists/${track.artist.slug}`} className="text-xs text-zinc-500 hover:text-zinc-300 truncate block transition-colors" onClick={(e) => e.stopPropagation()}>
            {track.artist.stageName}
          </Link>
        )}
      </div>

      {/* Genre */}
      <span className="hidden sm:block text-xs text-zinc-600">{genreLabel(track.genre, language)}</span>

      {/* Actions: Add to playlist & Like */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
        <button
          onClick={(e) => {
            e.stopPropagation();
            openAddToPlaylist({
              id: track.id,
              type: "track",
              title: track.title,
              coverUrl: track.coverUrl,
              artistName: track.artist?.stageName,
            });
          }}
          className="text-zinc-600 hover:text-purple-400 transition-colors p-1"
          aria-label={tr("Ajouter à une playlist", "Add to a playlist")}
          title={tr("Ajouter à une playlist", "Add to a playlist")}
        >
          <ListPlus className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); toggleLike(track.id); }}
          disabled={isPending}
          className={cn("transition-all p-1", liked && "text-pink-500")}
          aria-label={tr("J'aime", "Like")}
        >
          <Heart className={cn("h-4 w-4", liked ? "fill-current text-pink-500" : "text-zinc-600 hover:text-pink-400")} />
        </button>
      </div>

      {/* Duration */}
      <span className="text-xs text-zinc-600 w-10 text-right flex-shrink-0">
        {formatDuration(track.durationSec)}
      </span>
    </div>
  );
}
