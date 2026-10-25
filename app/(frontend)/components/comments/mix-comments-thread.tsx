"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle,
  Heart,
  Reply,
  Trash2,
  Edit2,
  Clock,
  Play,
  Send,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { mixesApi } from "@/app/(frontend)/lib/api/mixes";
import { socialApi } from "@/app/(frontend)/lib/api/social";
import { usePlayer, type PlayerTrack } from "@/app/(frontend)/providers/player-provider";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { formatDuration, timeAgo, cn } from "@/app/(frontend)/lib/utils";
import type { CommentDto, MixDetail } from "@/types/api";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

interface MixCommentsThreadProps {
  mix: MixDetail;
}

// Convert "mm:ss" or "hh:mm:ss" into total seconds
function parseTimestampToSeconds(ts: string): number | null {
  const parts = ts.split(":").map(Number);
  if (parts.some(isNaN)) return null;

  if (parts.length === 2) {
    const [min, sec] = parts;
    return min * 60 + sec;
  }
  if (parts.length === 3) {
    const [hr, min, sec] = parts;
    return hr * 3600 + min * 60 + sec;
  }
  return null;
}

// Render text and replace timestamps (e.g. "04:20" or "01:15:30") with interactive seeking buttons
function FormattedCommentContent({
  content,
  onTimestampClick,
}: {
  content: string;
  onTimestampClick: (seconds: number, label: string) => void;
}) {
  const timestampRegex = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = timestampRegex.exec(content)) !== null) {
    const start = match.index;
    const end = timestampRegex.lastIndex;
    const rawTs = match[1];
    const seconds = parseTimestampToSeconds(rawTs);

    // Text before the match
    if (start > lastIndex) {
      elements.push(content.substring(lastIndex, start));
    }

    if (seconds !== null) {
      elements.push(
        <button
          key={`ts-${start}`}
          onClick={(e) => {
            e.stopPropagation();
            onTimestampClick(seconds, rawTs);
          }}
          className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 hover:text-purple-300 font-mono text-xs font-bold transition-all border border-purple-500/30 hover:scale-105 active:scale-95"
          title={`Écouter à ${rawTs}`}
        >
          <Play className="h-2.5 w-2.5 fill-current" />
          <span>{rawTs}</span>
        </button>
      );
    } else {
      elements.push(rawTs);
    }

    lastIndex = end;
  }

  if (lastIndex < content.length) {
    elements.push(content.substring(lastIndex));
  }

  return (
    <p className="text-sm text-zinc-300 leading-relaxed break-words whitespace-pre-wrap">
      {elements}
    </p>
  );
}

export function MixCommentsThread({ mix }: MixCommentsThreadProps) {
  const { tr, language } = useI18n();
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const { play, track: currentTrack, currentTime, seek } = usePlayer();

  const [newComment, setNewComment] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent");
  const [filterWithTimestamps, setFilterWithTimestamps] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch comments
  const { data: commentsResponse, isLoading } = useQuery({
    queryKey: ["comments", mix.slug],
    queryFn: () => mixesApi.getComments(mix.id),
  });

  const comments = useMemo<CommentDto[]>(() => commentsResponse?.data ?? [], [commentsResponse]);

  // Check if this mix is currently loaded in the audio player
  const isThisMixPlaying = currentTrack?.id === mix.id;

  // Handle Seek or Play on timestamp click
  const handleTimestampClick = (seconds: number, label: string) => {
    if (isThisMixPlaying) {
      seek(seconds);
      toast.success(tr(`Lecture calée à ${label}`, `Jumped to ${label}`));
    } else {
      if (!mix.audioUrl) {
        toast.error(tr("Audio indisponible pour ce mix", "Audio unavailable for this mix"));
        return;
      }
      const pt: PlayerTrack = {
        id: mix.id,
        slug: mix.slug,
        title: mix.title,
        audioUrl: mix.audioUrl,
        coverUrl: mix.coverUrl,
        durationSec: mix.durationSec,
        artist: mix.artist,
        type: "mix",
      };
      play(pt);
      // Wait for play to mount, then seek
      setTimeout(() => seek(seconds), 300);
      toast.success(tr(`Lancement du mix à ${label}`, `Starting the mix at ${label}`));
    }
  };

  // Insert current playback timestamp into the comment input
  const handleInsertCurrentTimestamp = () => {
    if (!isThisMixPlaying) {
      toast.info(tr("Lancez d'abord la lecture de ce mix pour insérer son minutage actuel !", "Start playing this mix first to insert its current timestamp!"));
      return;
    }
    const formatted = formatDuration(Math.floor(currentTime));
    setNewComment((prev) => {
      const space = prev.length > 0 && !prev.endsWith(" ") ? " " : "";
      return `${prev}${space}${formatted} `;
    });
    textareaRef.current?.focus();
    toast.success(tr(`Minutage actuel [${formatted}] inséré`, `Current timestamp [${formatted}] inserted`));
  };

  // Mutation: Add Root Comment
  const addMutation = useMutation({
    mutationFn: (text: string) => mixesApi.addComment(mix.id, text),
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["comments", mix.slug] });
      queryClient.invalidateQueries({ queryKey: ["mix", mix.slug] });
      toast.success(tr("Commentaire publié !", "Comment posted!"));
    },
    onError: () => toast.error(tr("Erreur lors de la publication du commentaire", "Failed to post the comment")),
  });

  // Mutation: Add Reply
  const replyMutation = useMutation({
    mutationFn: ({ parentId, text }: { parentId: string; text: string }) =>
      mixesApi.addComment(mix.id, text, parentId),
    onSuccess: () => {
      setReplyingToId(null);
      setReplyContent("");
      queryClient.invalidateQueries({ queryKey: ["comments", mix.slug] });
      toast.success(tr("Réponse envoyée !", "Reply sent!"));
    },
    onError: () => toast.error(tr("Erreur lors de l'envoi de la réponse", "Failed to send the reply")),
  });

  // Mutation: Like Comment
  const likeMutation = useMutation({
    mutationFn: (commentId: string) => socialApi.likeComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", mix.slug] });
    },
  });

  // Mutation: Edit Comment
  const editMutation = useMutation({
    mutationFn: ({ commentId, text }: { commentId: string; text: string }) =>
      socialApi.updateComment(commentId, text),
    onSuccess: () => {
      setEditingId(null);
      setEditContent("");
      queryClient.invalidateQueries({ queryKey: ["comments", mix.slug] });
      toast.success(tr("Commentaire modifié", "Comment updated"));
    },
    onError: () => toast.error(tr("Impossible de modifier le commentaire", "Could not update the comment")),
  });

  // Mutation: Delete Comment
  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => socialApi.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", mix.slug] });
      queryClient.invalidateQueries({ queryKey: ["mix", mix.slug] });
      toast.success(tr("Commentaire supprimé", "Comment deleted"));
    },
    onError: () => toast.error(tr("Erreur lors de la suppression", "Failed to delete")),
  });

  // Filtered & Sorted comments
  const processedComments = useMemo(() => {
    let list = [...comments];

    if (filterWithTimestamps) {
      list = list.filter((c) => /\b\d{1,2}:\d{2}\b/.test(c.content));
    }

    if (sortBy === "popular") {
      list.sort((a, b) => b.likeCount - a.likeCount);
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [comments, sortBy, filterWithTimestamps]);

  return (
    <div className="space-y-6">
      {/* ── 1. Top Controls Bar: Counter + Sort / Filter ─────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-purple-400" />
          <h3 className="text-base sm:text-lg font-bold text-white">
            Commentaires ({comments.length})
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Timestamp Filter Toggle */}
          <button
            onClick={() => setFilterWithTimestamps(!filterWithTimestamps)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all",
              filterWithTimestamps
                ? "bg-purple-600/20 border-purple-500/40 text-purple-300 font-bold"
                : "bg-white/[0.04] border-white/[0.06] text-zinc-400 hover:text-white"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{tr("Avec timestamps", "With timestamps")}</span>
          </button>

          {/* Sort Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <button
              onClick={() => setSortBy("recent")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all",
                sortBy === "recent"
                  ? "bg-white/10 text-white font-bold"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              {tr("Récents", "Recent")}
            </button>
            <button
              onClick={() => setSortBy("popular")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all",
                sortBy === "popular"
                  ? "bg-white/10 text-white font-bold"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              {tr("Populaires", "Popular")}
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Add Comment Input Box ──────────────────────────────── */}
      {user ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newComment.trim()) addMutation.mutate(newComment.trim());
          }}
          className="relative p-4 rounded-2xl bg-[#111319] border border-white/[0.08] shadow-lg space-y-3"
        >
          <div className="flex items-start gap-3">
            {/* User Avatar */}
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-md">
              {user.profile?.displayName?.[0]?.toUpperCase() ?? "U"}
            </div>

            {/* Input area */}
            <div className="flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={tr("Partagez votre avis, mentionnez un drop mémorable (ex: 04:15)...", "Share your thoughts, mention a memorable drop (e.g. 04:15)...")}
                rows={2}
                maxLength={1000}
                className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-xs">
            {/* Button to insert current playback time */}
            <button
              type="button"
              onClick={handleInsertCurrentTimestamp}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all border",
                isThisMixPlaying
                  ? "bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/30"
                  : "bg-white/[0.03] text-zinc-500 border-white/[0.05] hover:text-zinc-300"
              )}
              title={tr("Insérer le minutage en cours de lecture", "Insert the current playback timestamp")}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>
                {isThisMixPlaying
                  ? `Minutage actuel (${formatDuration(Math.floor(currentTime))})`
                  : tr("Insérer un minutage", "Insert timestamp")}
              </span>
            </button>

            {/* Submit Button */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-zinc-500 font-mono">
                {newComment.length}/1000
              </span>

              <button
                type="submit"
                disabled={!newComment.trim() || addMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold transition-all shadow-md shadow-purple-900/30 hover:scale-105 active:scale-95"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{tr("Publier", "Post")}</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-2">
          <p className="text-xs text-zinc-400">
            {tr("Connectez-vous pour réagir et échanger sur ce mix avec la communauté.", "Log in to react and chat about this mix with the community.")}
          </p>
          <Link
            href="/login"
            className="inline-block px-4 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold transition-all"
          >
            {tr("Se connecter", "Log in")}
          </Link>
        </div>
      )}

      {/* ── 3. Comments List ──────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : processedComments.length > 0 ? (
        <div className="space-y-3">
          {processedComments.map((comment) => {
            const isAuthor = user?.id === comment.user.id;
            const isCreatorOfMix = mix.artist.userId === comment.user.id;
            const isEditing = editingId === comment.id;
            const isReplying = replyingToId === comment.id;

            return (
              <div
                key={comment.id}
                className="p-4 rounded-2xl bg-[#0f1117] border border-white/[0.05] hover:border-white/[0.08] transition-all space-y-3 group"
              >
                {/* Header: User avatar + Display name + Badges + Time + Menu */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative h-8 w-8 rounded-full overflow-hidden bg-zinc-800 ring-1 ring-white/10 flex-shrink-0">
                      {comment.user.avatarUrl ? (
                        <Image
                          src={comment.user.avatarUrl}
                          alt={comment.user.displayName}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-tr from-purple-800 to-pink-800 text-xs font-bold text-white">
                          {comment.user.displayName?.[0]?.toUpperCase() ?? "U"}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-bold text-white truncate">
                        {comment.user.displayName}
                      </span>

                      {/* Creator badge */}
                      {isCreatorOfMix && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider text-amber-300">
                          <UserCheck className="h-2.5 w-2.5" />
                          DJ
                        </span>
                      )}

                      <span className="text-[11px] text-zinc-500 font-medium">
                        {timeAgo(comment.createdAt, language)}
                      </span>
                    </div>
                  </div>

                  {/* Actions for Author / Admin */}
                  {(isAuthor || isAdmin) && !isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isAuthor && (
                        <button
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditContent(comment.content);
                          }}
                          className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
                          title={tr("Modifier", "Edit")}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(tr("Supprimer ce commentaire ?", "Delete this comment?"))) {
                            deleteMutation.mutate(comment.id);
                          }
                        }}
                        className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                        title={tr("Supprimer", "Delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Comment Content (or inline edit box) */}
                {isEditing ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                      className="w-full p-2.5 rounded-xl bg-white/[0.05] border border-purple-500/40 text-sm text-white focus:outline-none resize-none"
                    />
                    <div className="flex items-center justify-end gap-2 text-xs">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 rounded-lg text-zinc-400 hover:text-white"
                      >
                        {tr("Annuler", "Cancel")}
                      </button>
                      <button
                        onClick={() =>
                          editMutation.mutate({
                            commentId: comment.id,
                            text: editContent.trim(),
                          })
                        }
                        disabled={!editContent.trim() || editMutation.isPending}
                        className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold"
                      >
                        {tr("Enregistrer", "Save")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <FormattedCommentContent
                    content={comment.content}
                    onTimestampClick={handleTimestampClick}
                  />
                )}

                {/* Bottom Row: Likes + Reply toggle */}
                <div className="flex items-center gap-4 pt-1 text-xs text-zinc-500">
                  <button
                    onClick={() => likeMutation.mutate(comment.id)}
                    className="flex items-center gap-1.5 hover:text-pink-400 transition-colors group/like"
                  >
                    <Heart
                      className={cn(
                        "h-3.5 w-3.5 transition-transform group-hover/like:scale-110",
                        comment.likeCount > 0 && "text-pink-500 fill-current"
                      )}
                    />
                    <span>{comment.likeCount > 0 ? comment.likeCount : "Aimer"}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!user) {
                        toast.info(tr("Connectez-vous pour répondre", "Log in to reply"));
                        return;
                      }
                      setReplyingToId(isReplying ? null : comment.id);
                      setReplyContent("");
                    }}
                    className="flex items-center gap-1.5 hover:text-purple-300 transition-colors"
                  >
                    <Reply className="h-3.5 w-3.5" />
                    <span>{tr("Répondre", "Reply")}</span>
                  </button>
                </div>

                {/* Inline Reply Form */}
                {isReplying && (
                  <div className="pl-4 border-l-2 border-purple-500/30 pt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={`Répondre à ${comment.user.displayName}...`}
                        className="flex-1 bg-white/[0.04] text-xs text-white placeholder-zinc-500 px-3 py-2 rounded-xl border border-white/[0.08] focus:outline-none focus:border-purple-500"
                      />
                      <button
                        onClick={() => {
                          if (replyContent.trim()) {
                            replyMutation.mutate({
                              parentId: comment.id,
                              text: replyContent.trim(),
                            });
                          }
                        }}
                        disabled={!replyContent.trim() || replyMutation.isPending}
                        className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-xs font-bold text-white transition-all"
                      >
                        {tr("Répondre", "Reply")}
                      </button>
                    </div>
                  </div>
                )}

                {/* Threaded Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="pl-4 sm:pl-6 border-l-2 border-white/[0.06] space-y-2.5 pt-2 mt-2">
                    {comment.replies.map((reply) => {
                      const isReplyAuthor = user?.id === reply.user.id;
                      const isReplyCreator = mix.artist.userId === reply.user.id;

                      return (
                        <div
                          key={reply.id}
                          className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1.5 group/reply"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">
                                {reply.user.displayName}
                              </span>
                              {isReplyCreator && (
                                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/15 border border-amber-500/30 text-[9px] font-black text-amber-300">
                                  DJ
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-500">
                                {timeAgo(reply.createdAt, language)}
                              </span>
                            </div>

                            {(isReplyAuthor || isAdmin) && (
                              <button
                                onClick={() => {
                                  if (confirm(tr("Supprimer cette réponse ?", "Delete this reply?"))) {
                                    deleteMutation.mutate(reply.id);
                                  }
                                }}
                                className="opacity-0 group-hover/reply:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-opacity"
                                title={tr("Supprimer", "Delete")}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          <FormattedCommentContent
                            content={reply.content}
                            onTimestampClick={handleTimestampClick}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center space-y-2 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          <div className="h-10 w-10 mx-auto rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-white">
            {filterWithTimestamps
              ? tr("Aucun commentaire contenant un minutage", "No comments with a timestamp")
              : tr("Soyez le premier à commenter ce mix !", "Be the first to comment on this mix!")}
          </p>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            {tr("Partagez votre morceau favori ou notez les moments marquants du set.", "Share your favourite track or note the set's standout moments.")}
          </p>
        </div>
      )}
    </div>
  );
}
