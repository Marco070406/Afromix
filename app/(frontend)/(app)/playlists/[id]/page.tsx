"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Pause,
  Lock,
  Globe,
  Clock,
  ListMusic,
  Trash2,
  Shuffle,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  Edit3,
  Check,
  X,
  Music,
  Disc3,
  Loader2,
} from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { playlistsApi, type PlaylistItem } from "@/app/(frontend)/lib/api/playlists";
import { Button } from "@/app/(frontend)/components/ui/button";
import { Skeleton } from "@/app/(frontend)/components/ui/skeleton";
import { ErrorState } from "@/app/(frontend)/components/ui/error-state";
import { usePlayer, type PlayerTrack } from "@/app/(frontend)/providers/player-provider";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { formatDuration, cn } from "@/app/(frontend)/lib/utils";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

/* ──────────────────────── Gradient util ──────────────────────── */

const GRADIENTS = [
  "from-purple-700 via-pink-600 to-amber-500",
  "from-emerald-600 via-teal-700 to-cyan-800",
  "from-violet-700 via-fuchsia-600 to-rose-500",
  "from-sky-600 via-indigo-700 to-purple-800",
  "from-amber-600 via-orange-600 to-red-500",
  "from-pink-600 via-purple-700 to-indigo-800",
];

function getGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

/* ──────────────────────── Draggable Item Row ──────────────────── */

interface ItemRowProps {
  item: PlaylistItem;
  index: number;
  isOwner: boolean;
  isCurrentItem: boolean;
  isPlaying: boolean;
  onPlay: (index: number) => void;
  onRemove: (itemId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  totalItems: number;
  isDragging: boolean;
  onDragStart: (index: number) => void;
  onDragEnter: (index: number) => void;
  onDragEnd: () => void;
}

function ItemRow({
  item, index, isOwner, isCurrentItem, isPlaying,
  onPlay, onRemove, onMoveUp, onMoveDown, totalItems,
  isDragging, onDragStart, onDragEnter, onDragEnd,
}: ItemRowProps) {
  const { tr } = useI18n();
  const content = item.mix ?? item.track;
  if (!content) return null;

  const hasAudio = !!(item.mix?.audioUrl ?? item.track?.audioUrl);

  return (
    <div
      draggable={isOwner}
      onDragStart={(e) => {
        if (!isOwner) return;
        e.dataTransfer.effectAllowed = "move";
        onDragStart(index);
      }}
      onDragEnter={() => onDragEnter(index)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className={cn(
        "group flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 rounded-xl transition-all duration-200",
        isCurrentItem
          ? "bg-purple-500/10 border border-purple-500/20"
          : "hover:bg-white/[0.04] border border-transparent",
        isDragging && "opacity-50 scale-[0.98]"
      )}
    >
      {/* Drag handle */}
      {isOwner && (
        <div className="cursor-grab active:cursor-grabbing text-zinc-700 hover:text-zinc-400 transition-colors touch-none hidden sm:block">
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Track number / play indicator */}
      <button
        onClick={() => onPlay(index)}
        disabled={!hasAudio}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all text-sm font-bold",
          isCurrentItem && isPlaying
            ? "bg-purple-500 text-white"
            : hasAudio
              ? "bg-white/[0.04] text-zinc-500 group-hover:bg-purple-500/20 group-hover:text-purple-400"
              : "bg-white/[0.02] text-zinc-700 cursor-not-allowed"
        )}
      >
        {isCurrentItem && isPlaying ? (
          <Pause className="h-3.5 w-3.5 fill-current" />
        ) : isCurrentItem ? (
          <Play className="h-3.5 w-3.5 fill-current" />
        ) : (
          <span className="group-hover:hidden">{index + 1}</span>
        )}
        {!isCurrentItem && hasAudio && (
          <Play className="h-3.5 w-3.5 fill-current hidden group-hover:block" />
        )}
      </button>

      {/* Cover */}
      <div className="relative h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
        {content.coverUrl ? (
          <Image src={content.coverUrl} alt={content.title} fill className="object-cover" sizes="40px" />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50">
            <Music className="h-4 w-4 text-purple-400/60" />
          </div>
        )}
      </div>

      {/* Title & Artist */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          isCurrentItem ? "text-purple-400" : "text-white"
        )}>
          {content.title}
        </p>
        <p className="text-xs text-zinc-500 truncate">{content.artist.stageName}</p>
      </div>

      {/* Genre badge */}
      <span className="hidden md:inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-500 border border-white/[0.06]">
        {item.mix ? item.mix.genre : item.track?.genre}
      </span>

      {/* Duration */}
      <span className="text-xs text-zinc-600 tabular-nums min-w-[38px] text-right">
        {content.durationSec ? formatDuration(content.durationSec) : "—"}
      </span>

      {/* Owner actions */}
      {isOwner && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Move up/down on mobile (fallback for no drag) */}
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="sm:hidden p-1.5 text-zinc-600 hover:text-white transition-colors disabled:opacity-30"
            title={tr("Monter", "Move up")}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === totalItems - 1}
            className="sm:hidden p-1.5 text-zinc-600 hover:text-white transition-colors disabled:opacity-30"
            title={tr("Descendre", "Move down")}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors rounded-lg hover:bg-white/[0.06]"
            title={tr("Retirer", "Remove")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── Inline Edit Header ──────────────────── */

function EditableHeader({
  playlistId,
  title,
  description,
  isPublic,
}: {
  playlistId: string;
  title: string;
  description: string | null;
  isPublic: boolean;
}) {
  const { tr } = useI18n();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDesc, setEditDesc] = useState(description ?? "");
  const [editPublic, setEditPublic] = useState(isPublic);
  const titleRef = useRef<HTMLInputElement>(null);

  const updateMutation = useMutation({
    mutationFn: () =>
      playlistsApi.update(playlistId, {
        title: editTitle,
        description: editDesc || undefined,
        isPublic: editPublic,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success(tr("Playlist mise à jour !", "Playlist updated!"));
      setIsEditing(false);
    },
    onError: () => toast.error(tr("Erreur lors de la mise à jour", "Update failed")),
  });

  useEffect(() => {
    if (isEditing && titleRef.current) titleRef.current.focus();
  }, [isEditing]);

  if (!isEditing) {
    return (
      <div className="flex-1">
        <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider font-semibold">Playlist</p>
        <div className="flex items-center gap-2 group">
          <h1 className="text-xl sm:text-2xl font-bold text-white">{title}</h1>
          <button
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-white transition-all"
            title={tr("Modifier", "Edit")}
          >
            <Edit3 className="h-4 w-4" />
          </button>
        </div>
        {description && <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{description}</p>}
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-2 animate-fade-in">
      <p className="text-xs text-purple-400 mb-1 uppercase tracking-wider font-semibold">{tr("Modifier la playlist", "Edit playlist")}</p>
      <input
        ref={titleRef}
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
        maxLength={100}
        className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/[0.10] text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        placeholder={tr("Titre de la playlist", "Playlist title")}
      />
      <textarea
        value={editDesc}
        onChange={(e) => setEditDesc(e.target.value)}
        maxLength={500}
        rows={2}
        className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.10] text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
        placeholder={tr("Description (facultative)", "Description (optional)")}
      />
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={editPublic}
            onChange={(e) => setEditPublic(e.target.checked)}
            className="accent-purple-500"
          />
          {editPublic ? "Publique" : tr("Privée", "Private")}
        </label>
        <div className="flex-1" />
        <Button
          size="sm"
          onClick={() => updateMutation.mutate()}
          isLoading={updateMutation.isPending}
          className="gap-1"
        >
          <Check className="h-3.5 w-3.5" />Sauver
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setIsEditing(false);
            setEditTitle(title);
            setEditDesc(description ?? "");
            setEditPublic(isPublic);
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ──────────────────────── Main Page ──────────────────────── */

export default function PlaylistDetailPage() {
  const { tr } = useI18n();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { play, track: currentTrack, isPlaying, togglePlay } = usePlayer();
  const queryClient = useQueryClient();

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["playlist", id],
    queryFn: () => playlistsApi.get(id),
    enabled: !!id,
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => playlistsApi.removeItem(id, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist", id] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success(tr("Titre retiré de la playlist", "Track removed from the playlist"));
    },
    onError: () => toast.error(tr("Impossible de retirer ce titre", "Could not remove this track")),
  });

  const reorderMutation = useMutation({
    mutationFn: (items: Array<{ id: string; position: number }>) =>
      playlistsApi.reorder(id, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist", id] });
    },
    onError: () => toast.error(tr("Erreur lors du réordonnancement", "Reordering failed")),
  });

  const commitReorder = useCallback(
    (newItems: PlaylistItem[]) => {
      const reorderPayload = newItems.map((item, i) => ({ id: item.id, position: i }));
      reorderMutation.mutate(reorderPayload);
    },
    [reorderMutation]
  );

  // Build items array (maybe reordered optimistically)
  const playlist = data?.data;
  const isOwner = !!user && !!playlist && user.id === playlist.owner.id;

  // Local item state for optimistic drag reorder
  const [localItems, setLocalItems] = useState<PlaylistItem[]>(playlist?.items ?? []);
  const [syncedItems, setSyncedItems] = useState(playlist?.items);
  if (playlist?.items !== syncedItems) {
    setSyncedItems(playlist?.items);
    if (playlist?.items) setLocalItems(playlist.items);
  }

  const allTracks: PlayerTrack[] = localItems
    .filter((item) => item.mix?.audioUrl ?? item.track?.audioUrl)
    .map((item) =>
      item.mix
        ? {
            id: item.mix.id, slug: item.mix.slug, title: item.mix.title,
            audioUrl: item.mix.audioUrl!, coverUrl: item.mix.coverUrl,
            durationSec: item.mix.durationSec, artist: item.mix.artist,
            type: "mix" as const,
          }
        : {
            id: item.track!.id, slug: item.track!.slug, title: item.track!.title,
            audioUrl: item.track!.audioUrl!, coverUrl: item.track!.coverUrl,
            durationSec: item.track!.durationSec, artist: item.track!.artist,
            type: "track" as const,
          }
    );

  const handlePlayAll = () => {
    if (allTracks.length === 0) { toast.error(tr("Aucun contenu audio dans cette playlist", "No audio in this playlist")); return; }
    const isCurrentlyPlaying = allTracks.some((t) => t.id === currentTrack?.id);
    if (isCurrentlyPlaying) togglePlay();
    else play(allTracks[0], allTracks);
  };

  const handleShufflePlay = () => {
    if (allTracks.length === 0) return;
    const shuffled = [...allTracks].sort(() => Math.random() - 0.5);
    play(shuffled[0], shuffled);
    toast.success(tr("Lecture aléatoire !", "Shuffle on!"));
  };

  const handlePlayAt = (index: number) => {
    const item = localItems[index];
    const content = item.mix ?? item.track;
    const audioUrl = item.mix?.audioUrl ?? item.track?.audioUrl;
    if (!content || !audioUrl) return;

    const trackToPlay: PlayerTrack = {
      id: content.id,
      slug: content.slug,
      title: content.title,
      audioUrl,
      coverUrl: content.coverUrl,
      durationSec: content.durationSec,
      artist: content.artist,
      type: item.mix ? "mix" : "track",
    };

    // If already playing this track, toggle
    if (currentTrack?.id === trackToPlay.id) {
      togglePlay();
    } else {
      play(trackToPlay, allTracks);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...localItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setLocalItems(newItems);
    commitReorder(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index >= localItems.length - 1) return;
    const newItems = [...localItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setLocalItems(newItems);
    commitReorder(newItems);
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragEnter = (index: number) => setDragOverIndex(index);
  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newItems = [...localItems];
      const [moved] = newItems.splice(dragIndex, 1);
      newItems.splice(dragOverIndex, 0, moved);
      setLocalItems(newItems);
      commitReorder(newItems);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const totalDuration = localItems.reduce(
    (sum, item) => sum + (item.mix?.durationSec ?? item.track?.durationSec ?? 0),
    0
  );

  if (isLoading) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-48 w-full rounded-3xl" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error || !playlist) {
    return <ErrorState message="Playlist introuvable" onRetry={() => refetch()} />;
  }

  return (
    <div className="px-4 lg:px-8 py-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/playlists"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-5"
      >
        <ChevronLeft className="h-4 w-4" />
        {tr("Mes playlists", "My playlists")}
      </Link>

      {/* ── Hero Header ── */}
      <div className="relative rounded-3xl overflow-hidden mb-8">
        {/* Background gradient */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-30",
          getGradient(playlist.id)
        )} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0f] via-[#0a0b0f]/60 to-transparent" />

        <div className="relative flex flex-col sm:flex-row gap-5 p-5 sm:p-6">
          {/* Cover */}
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden flex-shrink-0 shadow-2xl shadow-black/60 mx-auto sm:mx-0">
            {playlist.coverUrl ? (
              <Image src={playlist.coverUrl} alt={playlist.title} fill className="object-cover" sizes="160px" />
            ) : (
              <div className={cn(
                "h-full w-full flex items-center justify-center bg-gradient-to-br",
                getGradient(playlist.id)
              )}>
                <ListMusic className="h-14 w-14 text-white/40" />
              </div>
            )}
          </div>

          {/* Editable Info */}
          <div className="flex flex-col justify-end flex-1 text-center sm:text-left">
            {isOwner ? (
              <EditableHeader
                playlistId={playlist.id}
                title={playlist.title}
                description={playlist.description}
                isPublic={playlist.isPublic}
              />
            ) : (
              <div>
                <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider font-semibold">Playlist</p>
                <h1 className="text-xl sm:text-2xl font-bold text-white">{playlist.title}</h1>
                {playlist.description && (
                  <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{playlist.description}</p>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-3 justify-center sm:justify-start flex-wrap">
              {playlist.isPublic ? (
                <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5 text-emerald-400/70" />Public</span>
              ) : (
                <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5 text-amber-400/70" />{tr("Privé", "Private")}</span>
              )}
              <span>·</span>
              <span>{playlist.itemCount} titre{playlist.itemCount !== 1 ? "s" : ""}</span>
              {totalDuration > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />{formatDuration(totalDuration)}
                  </span>
                </>
              )}
              <span>·</span>
              <span>{tr("par", "by")} {playlist.owner.displayName || tr("Utilisateur", "User")}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4 justify-center sm:justify-start">
              <Button
                onClick={handlePlayAll}
                className="gap-2"
                disabled={allTracks.length === 0}
              >
                {allTracks.some((t) => t.id === currentTrack?.id) && isPlaying ? (
                  <><Pause className="h-4 w-4" />Pause</>
                ) : (
                  <><Play className="h-4 w-4 fill-current" />{tr("Lire tout", "Play all")}</>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={handleShufflePlay}
                className="gap-2"
                disabled={allTracks.length < 2}
              >
                <Shuffle className="h-4 w-4" />
                <span className="hidden sm:inline">{tr("Aléatoire", "Shuffle")}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Items List ── */}
      {localItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
            <Music className="h-8 w-8 text-zinc-600" />
          </div>
          <h2 className="text-base font-bold text-white mb-1">{tr("Playlist vide", "Empty playlist")}</h2>
          <p className="text-sm text-zinc-500 max-w-xs mb-4">
            {tr("Ajoutez des mixes et tracks avec le bouton « + » sur n'importe quelle page de mix.", "Add mixes and tracks with the “+” button on any mix page.")}
          </p>
          <Link href="/explore">
            <Button variant="secondary" className="gap-2">
              <Disc3 className="h-4 w-4" />
              {tr("Découvrir des mixes", "Discover mixes")}
            </Button>
          </Link>
        </div>
      ) : (
        <div>
          {/* Column headers */}
          <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600 border-b border-white/[0.06] mb-1">
            {isOwner && <div className="w-4 hidden sm:block" />}
            <div className="w-8 text-center">#</div>
            <div className="w-10" />
            <div className="flex-1">{tr("Titre", "Title")}</div>
            <div className="hidden md:block w-20">Genre</div>
            <div className="w-[38px] text-right">
              <Clock className="h-3 w-3 inline" />
            </div>
            {isOwner && <div className="w-16" />}
          </div>

          {/* Rows */}
          <div className="space-y-0.5">
            {localItems.map((item, i) => {
              const content = item.mix ?? item.track;
              if (!content) return null;
              return (
                <ItemRow
                  key={item.id}
                  item={item}
                  index={i}
                  isOwner={isOwner}
                  isCurrentItem={currentTrack?.id === content.id}
                  isPlaying={isPlaying && currentTrack?.id === content.id}
                  onPlay={handlePlayAt}
                  onRemove={(itemId) => removeItemMutation.mutate(itemId)}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  totalItems={localItems.length}
                  isDragging={dragIndex === i}
                  onDragStart={handleDragStart}
                  onDragEnter={handleDragEnter}
                  onDragEnd={handleDragEnd}
                />
              );
            })}
          </div>

          {/* Reorder saving indicator */}
          {reorderMutation.isPending && (
            <div className="flex items-center justify-center gap-2 py-3 text-xs text-purple-400 animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {tr("Sauvegarde de l'ordre…", "Saving order…")}
            </div>
          )}

          {/* Footer stats */}
          <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-600">
            <span>{localItems.length} titre{localItems.length !== 1 ? "s" : ""} · {formatDuration(totalDuration)}</span>
            {isOwner && (
              <span className="hidden sm:inline text-zinc-700">
                {tr("Glissez-déposez pour réordonner · Raccourcis: ↑↓ pour déplacer", "Drag and drop to reorder · Shortcuts: ↑↓ to move")}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
