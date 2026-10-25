"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ListPlus,
  Plus,
  Check,
  Lock,
  Globe,
  Music,
  Loader2,
  X,
  LogIn,
  Sparkles,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { playlistsApi, type PlaylistSummary } from "@/app/(frontend)/lib/api/playlists";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { cn } from "@/app/(frontend)/lib/utils";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

export interface PlaylistItemTarget {
  id: string;
  type: "mix" | "track";
  title: string;
  coverUrl?: string | null;
  artistName?: string;
}

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: PlaylistItemTarget | null;
}

export function AddToPlaylistModal({
  isOpen,
  onClose,
  target,
}: AddToPlaylistModalProps) {
  const { tr } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [addedPlaylistIds, setAddedPlaylistIds] = useState<Set<string>>(new Set());
  const [loadingPlaylistId, setLoadingPlaylistId] = useState<string | null>(null);

  // Fetch user's playlists
  const { data: playlistsData, isLoading } = useQuery({
    queryKey: ["playlists", user?.id],
    queryFn: () => playlistsApi.list({ userId: user?.id, pageSize: 50 }),
    enabled: !!user && isOpen,
  });

  const playlists: PlaylistSummary[] = playlistsData?.data ?? [];

  // Mutation: add item to an existing playlist
  const addToPlaylistMutation = useMutation({
    mutationFn: async ({ playlistId }: { playlistId: string }) => {
      if (!target) return;
      setLoadingPlaylistId(playlistId);
      if (target.type === "mix") {
        return playlistsApi.addItem(playlistId, { mixId: target.id });
      } else {
        return playlistsApi.addItem(playlistId, { trackId: target.id });
      }
    },
    onSuccess: (_, { playlistId }) => {
      setAddedPlaylistIds((prev) => new Set(prev).add(playlistId));
      const pl = playlists.find((p) => p.id === playlistId);
      toast.success(
        pl ? `Ajouté à « ${pl.title} »` : tr("Ajouté à la playlist avec succès !", "Added to the playlist!")
      );
      queryClient.invalidateQueries({ queryKey: ["playlists", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
    },
    onError: (err: Error) => {
      const msg = err?.message || tr("Impossible d'ajouter à cette playlist", "Could not add to this playlist");
      toast.error(msg);
    },
    onSettled: () => {
      setLoadingPlaylistId(null);
    },
  });

  // Mutation: create a new playlist AND immediately add the current item
  const createAndAddMutation = useMutation({
    mutationFn: async () => {
      if (!target || !newTitle.trim()) return;
      const created = await playlistsApi.create({
        title: newTitle.trim(),
        isPublic,
      });
      const playlistId = created.data.id;
      if (target.type === "mix") {
        await playlistsApi.addItem(playlistId, { mixId: target.id });
      } else {
        await playlistsApi.addItem(playlistId, { trackId: target.id });
      }
      return created.data;
    },
    onSuccess: (createdPlaylist) => {
      if (createdPlaylist) {
        setAddedPlaylistIds((prev) => new Set(prev).add(createdPlaylist.id));
        toast.success(tr(`Playlist « ${createdPlaylist.title} » créée et titre ajouté !`, `Playlist “${createdPlaylist.title}” created and track added!`));
      }
      setNewTitle("");
      setIsCreatingNew(false);
      queryClient.invalidateQueries({ queryKey: ["playlists", user?.id] });
    },
    onError: () => {
      toast.error(tr("Erreur lors de la création de la playlist", "Failed to create the playlist"));
    },
  });

  const handleToggleAdd = (playlistId: string) => {
    if (addedPlaylistIds.has(playlistId)) {
      toast.info(tr("Déjà présent dans cette playlist", "Already in this playlist"));
      return;
    }
    addToPlaylistMutation.mutate({ playlistId });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createAndAddMutation.mutate();
  };

  if (!isOpen || !target) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md animate-fade-in" />

        {/* Modal Window */}
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-[#0f1016] border border-white/[0.08] p-6 shadow-2xl shadow-purple-950/30 outline-none animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                <ListPlus className="h-4 w-4" />
              </div>
              <Dialog.Title className="text-base font-bold text-white">
                {tr("Ajouter à une playlist", "Add to a playlist")}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                aria-label={tr("Fermer", "Close")}
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Target preview card */}
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] my-4">
            <div className="relative h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800">
              {target.coverUrl ? (
                <Image
                  src={target.coverUrl}
                  alt={target.title}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50">
                  <Music className="h-5 w-5 text-purple-300" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{target.title}</p>
              {target.artistName && (
                <p className="text-xs text-zinc-400 truncate mt-0.5">
                  {target.artistName}
                </p>
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 border border-white/[0.08]">
              {target.type === "mix" ? "Mix" : "Morceau"}
            </span>
          </div>

          {!user ? (
            /* Unauthenticated state */
            <div className="py-6 px-4 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
              <p className="text-sm text-zinc-400">
                {tr("Vous devez être connecté pour gérer vos playlists personnelles.", "You need to be logged in to manage your playlists.")}
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  href="/login"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 transition-opacity"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  {tr("Se connecter", "Log in")}
                </Link>
                <Link
                  href="/register"
                  onClick={onClose}
                  className="inline-flex items-center h-9 px-4 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] transition-colors"
                >
                  {tr("Créer un compte", "Create an account")}
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Playlists list */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 my-2">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 text-zinc-500 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                    <span className="text-xs">{tr("Chargement de vos playlists...", "Loading your playlists...")}</span>
                  </div>
                ) : playlists.length === 0 ? (
                  <div className="text-center py-6 px-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                    <Sparkles className="h-6 w-6 text-purple-400 mx-auto mb-2 opacity-80" />
                    <p className="text-sm font-medium text-white">{tr("Aucune playlist pour le moment", "No playlists yet")}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {tr("Créez votre toute première playlist ci-dessous pour y sauvegarder ce titre.", "Create your very first playlist below to save this track.")}
                    </p>
                  </div>
                ) : (
                  playlists.map((pl) => {
                    const isAdded = addedPlaylistIds.has(pl.id);
                    const isTargetLoading = loadingPlaylistId === pl.id;

                    return (
                      <button
                        key={pl.id}
                        type="button"
                        onClick={() => handleToggleAdd(pl.id)}
                        disabled={isTargetLoading}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 p-2.5 rounded-xl transition-all text-left group border",
                          isAdded
                            ? "bg-purple-600/15 border-purple-500/30 text-purple-200"
                            : "bg-white/[0.02] border-transparent hover:bg-white/[0.06] hover:border-white/[0.06] text-white"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                            {pl.coverUrl ? (
                              <Image
                                src={pl.coverUrl}
                                alt={pl.title}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-pink-900/30">
                                <Music className="h-4 w-4 text-purple-400/60" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{pl.title}</p>
                            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                              <span>
                                {pl.itemCount} titre{pl.itemCount > 1 ? "s" : ""}
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                {pl.isPublic ? (
                                  <>
                                    <Globe className="h-3 w-3" /> Public
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-3 w-3" /> Privé
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action status */}
                        <div className="flex-shrink-0">
                          {isTargetLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                          ) : isAdded ? (
                            <span className="h-7 w-7 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                              <Check className="h-4 w-4" />
                            </span>
                          ) : (
                            <span className="h-7 w-7 rounded-full bg-white/[0.06] group-hover:bg-purple-600 group-hover:text-white text-zinc-400 flex items-center justify-center transition-colors">
                              <Plus className="h-4 w-4" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Quick Create New Playlist Section */}
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                {!isCreatingNew ? (
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-sm font-medium text-purple-300 hover:text-white transition-colors border border-dashed border-purple-500/30"
                  >
                    <Plus className="h-4 w-4" />
                    {tr("Créer une nouvelle playlist", "Create a new playlist")}
                  </button>
                ) : (
                  <form onSubmit={handleCreateSubmit} className="space-y-3 animate-fade-in">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        {tr("Nom de la playlist", "Playlist name")}
                      </label>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder={tr("Ex: Soirée Afro, Coupé Décalé...", "E.g. Afro Night, Coupé Décalé...")}
                        maxLength={100}
                        autoFocus
                        className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/[0.10] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isPublic}
                          onChange={(e) => setIsPublic(e.target.checked)}
                          className="accent-purple-500 rounded"
                        />
                        Playlist publique (visible sur votre profil)
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={!newTitle.trim() || createAndAddMutation.isPending}
                        className="flex-1 h-9 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {createAndAddMutation.isPending ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {tr("Création...", "Creating...")}
                          </>
                        ) : (
                          tr("Créer et ajouter", "Create and add")
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingNew(false);
                          setNewTitle("");
                        }}
                        className="h-9 px-3 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-white/[0.06] hover:bg-white/[0.10] transition-colors"
                      >
                        {tr("Annuler", "Cancel")}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
