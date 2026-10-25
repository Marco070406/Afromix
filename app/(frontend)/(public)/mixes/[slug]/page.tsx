"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Pause,
  Heart,
  Share2,
  Clock,
  Eye,
  Music2,
  ListPlus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { mixesApi } from "@/app/(frontend)/lib/api/mixes";
import { Button } from "@/app/(frontend)/components/ui/button";
import { Skeleton, TrackRowSkeleton } from "@/app/(frontend)/components/ui/skeleton";
import { ErrorState } from "@/app/(frontend)/components/ui/error-state";
import { MixCard } from "@/app/(frontend)/components/cards/mix-card";
import { usePlayer, type PlayerTrack } from "@/app/(frontend)/providers/player-provider";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { useLikedMixIds } from "@/app/(frontend)/hooks/use-liked-mix-ids";
import { useAddToPlaylist } from "@/app/(frontend)/providers/playlist-modal-provider";
import { discoveryApi } from "@/app/(frontend)/lib/api/discovery";
import { MixCommentsThread } from "@/app/(frontend)/components/comments/mix-comments-thread";
import { formatDuration, formatCount, timeAgo, genreLabel, MIX_TYPE_LABELS, cn } from "@/app/(frontend)/lib/utils";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MixDetailPage() {
  const { tr, language } = useI18n();
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { play, track: currentTrack, isPlaying, togglePlay, seek } = usePlayer();
  const { isLiked, toggleLike, isPending: likePending } = useLikedMixIds();
  const { openAddToPlaylist } = useAddToPlaylist();
  const [activeTab, setActiveTab] = useState<"tracklist" | "comments">("tracklist");
  const [coverErr, setCoverErr] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["mix", slug],
    queryFn: () => mixesApi.getBySlug(slug),
    enabled: !!slug,
  });

  const { data: similarData } = useQuery({
    queryKey: ["similar-mixes", slug],
    queryFn: () => discoveryApi.similarMixes(slug, 6),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-5xl mx-auto space-y-6">
        <div className="flex gap-6">
          <Skeleton className="w-56 h-56 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-3 pt-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-10 w-40 mt-4" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => <TrackRowSkeleton key={i} />)}
      </div>
    );
  }

  if (error || !data?.data) {
    return <ErrorState message="Mix introuvable ou indisponible" onRetry={() => refetch()} />;
  }

  const mix = data.data;
  const isCurrentMix = currentTrack?.id === mix.id;
  const liked = isLiked(mix.id);

  const handlePlay = () => {
    if (!mix.audioUrl) { toast.error(tr("L'audio de ce mix n'est pas encore disponible", "This mix's audio isn't available yet")); return; }
    const pt: PlayerTrack = {
      id: mix.id, slug: mix.slug, title: mix.title, audioUrl: mix.audioUrl,
      coverUrl: mix.coverUrl, durationSec: mix.durationSec, artist: mix.artist, type: "mix",
    };
    if (isCurrentMix) togglePlay();
    else play(pt);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/mixes/${mix.slug}`;
    if (navigator.share) {
      await navigator.share({ title: mix.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(tr("Lien copié !", "Link copied!"));
    }
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-5xl mx-auto">
      {/* Mix header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        {/* Cover */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden flex-shrink-0 bg-zinc-900 self-center sm:self-start shadow-2xl shadow-black/50">
          {mix.coverUrl && !coverErr ? (
            <Image src={mix.coverUrl} alt={mix.title} fill className="object-cover" sizes="224px" priority onError={() => setCoverErr(true)} />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50">
              <Music2 className="h-16 w-16 text-purple-400/50" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-end flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 border border-white/[0.08]">
              {MIX_TYPE_LABELS[mix.mixType] ?? mix.mixType}
            </span>
            <span className="text-xs text-zinc-500">{genreLabel(mix.genre, language)}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">{mix.title}</h1>
          <Link href={`/artists/${mix.artist.slug}`} className="text-base text-zinc-400 hover:text-white transition-colors mb-3 font-medium">
            {mix.artist.stageName}
          </Link>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-zinc-500 mb-5">
            <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{formatCount(mix.playCount)}</span>
            <span className="flex items-center gap-1"><Heart className="h-4 w-4" />{formatCount(mix.likeCount)}</span>
            {mix.durationSec && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{formatDuration(mix.durationSec)}</span>}
            {mix.publishedAt && <span>{timeAgo(mix.publishedAt, language)}</span>}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={handlePlay} size="lg" className="gap-2" disabled={!mix.audioUrl}>
              {isCurrentMix && isPlaying ? <><Pause className="h-5 w-5" />{tr("Pause", "Pause")}</> : <><Play className="h-5 w-5" />{tr("Écouter", "Play")}</>}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => { if (!user) { toast.error(tr("Connectez-vous", "Please log in")); return; } if (!likePending) toggleLike(mix.id); }}
              aria-label={tr("J'aime", "Like")}
              className={liked ? "text-pink-500 border-pink-500/30" : ""}
            >
              <Heart className={cn("h-5 w-5", liked && "fill-current text-pink-500")} />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() =>
                openAddToPlaylist({
                  id: mix.id,
                  type: "mix",
                  title: mix.title,
                  coverUrl: mix.coverUrl,
                  artistName: mix.artist.stageName,
                })
              }
              aria-label={tr("Ajouter à une playlist", "Add to a playlist")}
              title={tr("Ajouter à une playlist", "Add to a playlist")}
            >
              <ListPlus className="h-5 w-5" />
            </Button>
            <Button variant="secondary" size="icon" onClick={handleShare} aria-label={tr("Partager", "Share")}>
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Description */}
      {mix.description && (
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">{mix.description}</p>
      )}

      {/* Tags */}
      {mix.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {mix.tags.map((tag) => (
            <Link key={tag} href={`/explore?q=${tag}`} className="text-xs px-3 py-1 rounded-full bg-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.10] transition-colors">
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-white/[0.06] pb-1">
        {[
          { id: "tracklist" as const, label: `Tracklist (${mix.tracklist.length})` },
          { id: "comments" as const, label: `Commentaires (${mix.commentCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
              activeTab === tab.id ? "text-white border-b-2 border-purple-500" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tracklist */}
      {activeTab === "tracklist" && (
        <div className="space-y-1 mb-8">
          {mix.tracklist.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4">{tr("Pas de tracklist disponible pour ce mix.", "No tracklist available for this mix.")}</p>
          ) : (
            mix.tracklist.map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors group cursor-pointer"
                onClick={() => { if (isCurrentMix && entry.startSec != null) seek(entry.startSec); }}
              >
                <span className="w-6 text-xs text-zinc-600 text-right flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{entry.title}</p>
                  <p className="text-xs text-zinc-500 truncate">{entry.artist.stageName}</p>
                </div>
                {entry.startSec != null && (
                  <span className="text-xs text-zinc-600 group-hover:text-purple-400 transition-colors flex-shrink-0">
                    {formatSeconds(entry.startSec)}
                  </span>
                )}
                {entry.durationSec && (
                  <span className="text-xs text-zinc-600 w-10 text-right flex-shrink-0">
                    {formatDuration(entry.durationSec)}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Comments */}
      {activeTab === "comments" && (
        <div className="mb-8">
          <MixCommentsThread mix={mix} />
        </div>
      )}

      {/* Similar mixes */}
      {(similarData?.data?.length ?? 0) > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-semibold text-white mb-4">{tr("Mixes similaires", "Similar mixes")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {similarData!.data.map((m) => <MixCard key={m.id} mix={m} />)}
          </div>
        </section>
      )}
    </div>
  );
}
