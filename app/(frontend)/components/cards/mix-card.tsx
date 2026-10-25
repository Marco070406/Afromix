"use client";

import Link from "next/link";
import Image from "next/image";
import { Play, Heart, ListPlus, Music } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { MixSummary } from "@/types/api";
import { usePlayer } from "@/app/(frontend)/providers/player-provider";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { useLikedMixIds } from "@/app/(frontend)/hooks/use-liked-mix-ids";
import { useAddToPlaylist } from "@/app/(frontend)/providers/playlist-modal-provider";
import { formatDuration, formatCount, genreLabel, cn } from "@/app/(frontend)/lib/utils";
import type { PlayerTrack } from "@/app/(frontend)/providers/player-provider";

interface MixCardProps {
  mix: MixSummary;
  queue?: MixSummary[];
  showArtist?: boolean;
  /** @deprecated - kept for API compat but the global hook is the source of truth */
  isLiked?: boolean;
}

function mixToPlayerTrack(mix: MixSummary): PlayerTrack | null {
  if (!mix.audioUrl || !mix.artist) return null;
  return {
    id: mix.id,
    slug: mix.slug,
    title: mix.title,
    audioUrl: mix.audioUrl,
    coverUrl: mix.coverUrl,
    durationSec: mix.durationSec,
    artist: mix.artist,
    type: "mix",
  };
}

export function MixCard({ mix, queue, showArtist = true }: MixCardProps) {
  const { user } = useAuth();
  const { play, track: currentTrack, isPlaying, togglePlay } = usePlayer();
  const { t, tr, language } = useI18n();
  const { isLiked, toggleLike, isPending } = useLikedMixIds();
  const { openAddToPlaylist } = useAddToPlaylist();
  const [coverErr, setCoverErr] = useState(false);

  const liked = isLiked(mix.id);
  const isCurrentTrack = currentTrack?.id === mix.id;

  const handlePlay = () => {
    const playerTrack = mixToPlayerTrack(mix);
    if (!playerTrack) {
      toast.error(t("player.unavailable"));
      return;
    }
    if (isCurrentTrack) {
      togglePlay();
    } else {
      const playerQueue = (queue ?? [mix])
        .map(mixToPlayerTrack)
        .filter(Boolean) as PlayerTrack[];
      play(playerTrack, playerQueue);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { toast.error(t("player.loginToLike")); return; }
    if (!isPending) toggleLike(mix.id);
  };

  return (
    <div className="group relative flex flex-col gap-2.5">
      {/* Cover */}
      <Link href={`/mixes/${mix.slug}`} className="block">
        <div className={cn(
          "relative aspect-square w-full rounded-xl overflow-hidden bg-surface-2 ring-1 transition-shadow duration-300",
          isCurrentTrack ? "ring-brand/60 shadow-lg shadow-brand/15" : "ring-line group-hover:shadow-xl group-hover:shadow-black/40"
        )}>
          {mix.coverUrl && !coverErr ? (
            <Image
              src={mix.coverUrl}
              alt={mix.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              onError={() => setCoverErr(true)}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-surface-3">
              <Music className="h-10 w-10 text-subtle" />
            </div>
          )}
          {/* Dégradé bas pour faire ressortir le bouton */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-200",
            isCurrentTrack ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )} />
          {/* Genre badge */}
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/55 backdrop-blur text-zinc-200">
              {genreLabel(mix.genre, language)}
            </span>
          </div>
          {/* Bouton lecture : glisse depuis le bas au survol */}
          <button
            onClick={(e) => { e.preventDefault(); handlePlay(); }}
            className={cn(
              "absolute bottom-2.5 right-2.5 h-11 w-11 rounded-full bg-brand-gradient flex items-center justify-center text-white shadow-lg shadow-black/40 transition-all duration-200 hover:scale-105",
              isCurrentTrack ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 focus:opacity-100 focus:translate-y-0"
            )}
            aria-label={isCurrentTrack && isPlaying ? "Pause" : tr("Lire", "Play")}
          >
            {isCurrentTrack && isPlaying ? (
              <span className="flex gap-0.5 items-end h-4">
                <span className="bar-1 w-1 h-4 bg-white rounded-sm origin-bottom" />
                <span className="bar-2 w-1 h-4 bg-white rounded-sm origin-bottom" />
                <span className="bar-3 w-1 h-4 bg-white rounded-sm origin-bottom" />
              </span>
            ) : (
              <Play className="h-5 w-5 ml-0.5 fill-current" />
            )}
          </button>
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/mixes/${mix.slug}`} className="text-sm font-semibold text-white truncate hover:underline underline-offset-2 leading-snug flex-1 min-w-0">
            {mix.title}
          </Link>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openAddToPlaylist({
                  id: mix.id,
                  type: "mix",
                  title: mix.title,
                  coverUrl: mix.coverUrl,
                  artistName: mix.artist?.stageName,
                });
              }}
              className="text-subtle hover:text-white transition-colors p-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label={tr("Ajouter à une playlist", "Add to a playlist")}
              title={tr("Ajouter à une playlist", "Add to a playlist")}
            >
              <ListPlus className="h-4 w-4" />
            </button>
            <button
              onClick={handleLike}
              className={cn(
                "flex-shrink-0 transition-colors p-0.5",
                liked ? "text-brand-2" : "text-subtle hover:text-white"
              )}
              aria-label={tr("J'aime", "Like")}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} />
            </button>
          </div>
        </div>

        {showArtist && mix.artist && (
          <Link href={`/artists/${mix.artist.slug}`} className="text-xs text-muted hover:text-white truncate transition-colors">
            {mix.artist.stageName}
          </Link>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-subtle tabular-nums">
          <span>{formatCount(mix.playCount)} {tr("écoutes", "plays")}</span>
          {mix.durationSec && (
            <>
              <span>·</span>
              <span>{formatDuration(mix.durationSec)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
