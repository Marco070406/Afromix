"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  ListMusic,
  Lock,
  Globe,
  Trash2,
  Play,
  Disc3,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { RequireAuth } from "@/app/(frontend)/components/auth/require-auth";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { playlistsApi, type PlaylistSummary } from "@/app/(frontend)/lib/api/playlists";
import { Button } from "@/app/(frontend)/components/ui/button";
import { Skeleton } from "@/app/(frontend)/components/ui";
import { cn } from "@/app/(frontend)/lib/utils";
import type { Translate } from "@/app/(frontend)/providers/i18n-provider";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

/* ──────────────────────── Validation ──────────────────────── */

const makeCreateSchema = (tr: Translate) => z.object({
  title: z.string().min(1, tr("Titre requis", "Title required")).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean(),
});
type CreateForm = z.infer<ReturnType<typeof makeCreateSchema>>;

/* ──────────────────────── Gradient presets for cover placeholders ──── */

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

/* ──────────────────────── Playlist Card ──────────────────────── */

function PlaylistCard({
  playlist,
  onDelete,
}: {
  playlist: PlaylistSummary;
  onDelete: (id: string) => void;
}) {
  const { tr } = useI18n();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="group relative">
      <Link
        href={`/playlists/${playlist.id}`}
        className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.10] transition-all duration-300"
      >
        {/* Cover */}
        <div className="relative h-16 w-16 rounded-xl overflow-hidden flex-shrink-0 shadow-lg shadow-black/30">
          {playlist.coverUrl ? (
            <Image src={playlist.coverUrl} alt={playlist.title} fill className="object-cover" sizes="64px" />
          ) : (
            <div className={cn("h-full w-full flex items-center justify-center bg-gradient-to-br", getGradient(playlist.id))}>
              <ListMusic className="h-6 w-6 text-white/70" />
            </div>
          )}
          {/* Play hover overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play className="h-5 w-5 text-white fill-white" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
            {playlist.title}
          </p>
          {playlist.description && (
            <p className="text-xs text-zinc-500 truncate mt-0.5">{playlist.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-600">
            {playlist.isPublic ? (
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{tr("Publique", "Public")}</span>
            ) : (
              <span className="flex items-center gap-1"><Lock className="h-3 w-3" />{tr("Privée", "Private")}</span>
            )}
            <span>·</span>
            <span>{playlist.itemCount} titre{playlist.itemCount !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Decorative waveform dots */}
        <div className="hidden sm:flex items-end gap-[2px] h-6 opacity-0 group-hover:opacity-60 transition-opacity">
          {[3, 5, 8, 6, 9, 4, 7, 5, 3].map((h, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-gradient-to-t from-purple-500 to-pink-400"
              style={{ height: `${h * 2}px`, animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      </Link>

      {/* Delete zone */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {confirmDelete ? (
          <div className="flex items-center gap-1.5 animate-fade-in">
            <button
              onClick={() => { onDelete(playlist.id); setConfirmDelete(false); }}
              className="text-xs font-semibold text-red-400 bg-red-500/15 hover:bg-red-500/25 px-2.5 py-1 rounded-lg transition-colors"
            >
              {tr("Confirmer", "Confirm")}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-zinc-500 hover:text-white px-2 py-1 rounded-lg transition-colors"
            >
              {tr("Non", "No")}
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.preventDefault(); setConfirmDelete(true); }}
            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-1.5 rounded-lg hover:bg-white/[0.06]"
            title={tr("Supprimer", "Delete")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────── Create Playlist Modal ──────────────── */

function CreatePlaylistModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { tr } = useI18n();
  const queryClient = useQueryClient();
  const backdropRef = useRef<HTMLDivElement>(null);

  const createMutation = useMutation({
    mutationFn: (d: CreateForm) => playlistsApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success(tr("Playlist créée !", "Playlist created!"));
      onCreated();
      reset();
    },
    onError: () => toast.error(tr("Impossible de créer la playlist", "Could not create the playlist")),
  });

  const {
    register, handleSubmit, reset, control,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(makeCreateSchema(tr)),
    defaultValues: { isPublic: true, description: "" },
  });

  const isPublic = useWatch({ control, name: "isPublic" });

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-3xl bg-[#0f1016]/95 border border-white/[0.08] p-6 shadow-2xl shadow-purple-950/40 animate-scale-in">
        {/* Decorative glow */}
        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{tr("Nouvelle playlist", "New playlist")}</h2>
            <p className="text-xs text-zinc-500">{tr("Organisez vos mixes et morceaux favoris", "Organise your favourite mixes and tracks")}</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit((d) => createMutation.mutate(d))}
          className="space-y-4"
        >
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">{tr("Nom de la playlist", "Playlist name")}</label>
            <input
              {...register("title")}
              placeholder={tr("Ex: Soirée Afrobeats, Chill Amapiano…", "E.g. Afrobeats Night, Chill Amapiano…")}
              maxLength={100}
              autoFocus
              className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            />
            {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Description <span className="text-zinc-600 font-normal">{tr("(facultative)", "(optional)")}</span>
            </label>
            <textarea
              {...register("description")}
              placeholder={tr("Décrivez l'ambiance de votre playlist…", "Describe your playlist's vibe…")}
              maxLength={500}
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.10] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none"
            />
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              {isPublic ? (
                <Globe className="h-4 w-4 text-emerald-400" />
              ) : (
                <Lock className="h-4 w-4 text-amber-400" />
              )}
              <div>
                <p className="text-sm font-medium text-white">
                  {isPublic ? "Playlist publique" : tr("Playlist privée", "Private playlist")}
                </p>
                <p className="text-xs text-zinc-500">
                  {isPublic ? "Visible par tous sur votre profil" : "Uniquement visible par vous"}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" {...register("isPublic")} className="sr-only peer" />
              <div className="w-10 h-5 bg-zinc-700 peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" className="flex-1 gap-2" isLoading={isSubmitting || createMutation.isPending}>
              <Plus className="h-4 w-4" />
              {tr("Créer la playlist", "Create playlist")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { onClose(); reset(); }}
            >
              {tr("Annuler", "Cancel")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ──────────────────────── Page Principale ──────────────────────── */

export default function PlaylistsPage() {
  const { tr } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["playlists", user?.id],
    queryFn: () => playlistsApi.list({ userId: user?.id }),
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => playlistsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success(tr("Playlist supprimée", "Playlist deleted"));
    },
    onError: () => toast.error(tr("Impossible de supprimer", "Could not delete")),
  });

  const playlists = data?.data ?? [];

  return (
    <RequireAuth>
      <div className="px-4 lg:px-8 py-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {tr("Mes playlists", "My playlists")}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {playlists.length > 0
                ? tr(
                    `${playlists.length} playlist${playlists.length > 1 ? "s" : ""} créée${playlists.length > 1 ? "s" : ""}`,
                    `${playlists.length} playlist${playlists.length > 1 ? "s" : ""} created`
                  )
                : tr("Créez votre première collection", "Create your first collection")}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="gap-2 shadow-lg shadow-purple-500/20"
          >
            <Plus className="h-4 w-4" />
            {tr("Créer", "Create")}
          </Button>
        </div>

        {/* Create Modal */}
        <CreatePlaylistModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[76px] w-full rounded-2xl" />
            ))}
          </div>
        ) : playlists.length > 0 ? (
          <div className="space-y-2">
            {playlists.map((p) => (
              <PlaylistCard
                key={p.id}
                playlist={p}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center mb-4">
              <Disc3 className="h-10 w-10 text-purple-400/60" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">{tr("Aucune playlist", "No playlists")}</h2>
            <p className="text-sm text-zinc-500 max-w-xs mb-6">
              {tr("Créez votre première playlist pour organiser vos mixes et morceaux préférés.", "Create your first playlist to organise your favourite mixes and tracks.")}
            </p>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {tr("Créer ma première playlist", "Create my first playlist")}
            </Button>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
