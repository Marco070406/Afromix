"use client";

import { useState } from "react";
import { createPortal } from "react-dom";import Image from "next/image";
import Link from "next/link";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Ticket,
  Share2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { eventsApi } from "@/app/(frontend)/lib/api/events";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { EventItem } from "@/types/api";
import { useIsClient } from "@/app/(frontend)/hooks/use-is-client";

interface EventDetailModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string, title: string) => void;
}

export function EventDetailModal({ event, isOpen, onClose, onDelete }: EventDetailModalProps) {
  const { user, isAdmin } = useAuth();
  const { language, tr } = useI18n();
  const queryClient = useQueryClient();
  const mounted = useIsClient();

  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const moderateMutation = useMutation({
    mutationFn: (data: { action: "APPROVE" } | { action: "REJECT"; reason: string }) => {
      if (!event) throw new Error("No event");
      return eventsApi.moderate(event.id, data);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      const status = res.data?.status;
      if (status === "APPROVED") {
        toast.success(
          language === "fr" ? "Événement validé et publié !" : "Event approved and published!"
        );
      } else {
        toast.success(
          language === "fr" ? "Événement rejeté. Notification et email envoyés." : "Event rejected. Creator notified."
        );
      }
      setIsRejecting(false);
      setRejectReason("");
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err?.message || tr("Erreur lors de la modération", "Moderation failed"));
    },
  });

  if (!isOpen || !event) return null;

  const isOwner = user && event.createdById === user.id;

  const startDate = new Date(event.startAt);
  const formattedStartDate = startDate.toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const startTime = startDate.toLocaleTimeString(language === "fr" ? "fr-FR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let formattedEndDate: string | null = null;
  if (event.endAt) {
    const endDate = new Date(event.endAt);
    formattedEndDate = endDate.toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const handleShare = () => {
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/events/${event.id}` : "";
    if (navigator.share) {
      navigator.share({ title: event.title, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success(language === "fr" ? "Lien copié dans le presse-papier" : "Link copied to clipboard");
    }
  };

  const handleApprove = () => {
    if (confirm(language === "fr" ? "Valider cet événement et le rendre visible sur la plateforme ?" : "Approve and publish this event?")) {
      moderateMutation.mutate({ action: "APPROVE" });
    }
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toast.error(language === "fr" ? "Veuillez indiquer un motif de refus" : "Please provide a rejection reason");
      return;
    }
    moderateMutation.mutate({ action: "REJECT", reason: rejectReason.trim() });
  };

  if (!isOpen || !event || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl bg-[#0f1117] border border-white/10 shadow-2xl text-white flex flex-col no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition-all shadow-lg"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Hero Image */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-zinc-900 flex-shrink-0">
          {event.coverUrl ? (
            <Image
              src={event.coverUrl}
              alt={event.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 800px"
              priority
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-purple-950 via-zinc-900 to-pink-950 flex items-center justify-center">
              <Calendar className="h-16 w-16 text-white/20" />
            </div>
          )}

          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1117] via-[#0f1117]/30 to-black/40 pointer-events-none" />

          {/* Status Badge on top */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            {event.status === "PENDING" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 backdrop-blur-md">
                <Clock className="h-3.5 w-3.5" />
                {language === "fr" ? "En attente de validation admin" : "Pending admin review"}
              </span>
            )}
            {event.status === "REJECTED" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 border border-red-500/40 text-red-300 backdrop-blur-md">
                <XCircle className="h-3.5 w-3.5" />
                {language === "fr" ? "Événement refusé" : "Event rejected"}
              </span>
            )}
            {event.status === "APPROVED" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 backdrop-blur-md">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {language === "fr" ? "Validé & En ligne" : "Live & Approved"}
              </span>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Rejection Alert if rejected */}
          {event.status === "REJECTED" && event.rejectionReason && (isOwner || isAdmin) && (
            <div className="rounded-2xl bg-red-950/40 border border-red-500/30 p-4 sm:p-5 flex items-start gap-3.5 text-red-200">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <h4 className="font-bold text-red-300">
                  {language === "fr" ? "Motif du refus de modération :" : "Rejection Reason:"}
                </h4>
                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                  {event.rejectionReason}
                </p>
                <p className="text-[11px] text-zinc-400 mt-2">
                  {language === "fr"
                    ? tr("Ce motif a également été envoyé par notification et email au créateur.", "This reason was also sent to the creator by notification and email.")
                    : "This reason was also sent via notification and email to the creator."}
                </p>
              </div>
            </div>
          )}

          {/* Admin Moderation Panel */}
          {isAdmin && event.status === "PENDING" && (
            <div className="rounded-2xl bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-pink-950/30 border border-purple-500/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                  <ShieldCheck className="h-5 w-5 text-purple-400" />
                  <span>{language === "fr" ? "Panneau de modération Administrateur" : "Admin Moderation Panel"}</span>
                </div>
                <span className="text-xs text-zinc-400">
                  {event.createdBy?.email ? `Créé par ${event.createdBy.email}` : ""}
                </span>
              </div>

              {!isRejecting ? (
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={moderateMutation.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{language === "fr" ? "Approuver et publier" : "Approve & Publish"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRejecting(true)}
                    disabled={moderateMutation.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-red-300 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 transition-all disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>{language === "fr" ? "Rejeter l'événement..." : "Reject Event..."}</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConfirmReject} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-red-300 mb-1">
                      {language === "fr"
                        ? tr("Motif du refus (obligatoire — sera envoyé par email et notification) :", "Rejection reason (required — will be sent by email and notification):")
                        : "Rejection Reason (required — sent via email and notification):"}
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder={
                        language === "fr"
                          ? tr("ex: L'affiche est illisible ou la date est déjà passée. Merci de corriger.", "e.g. The poster is unreadable or the date has passed. Please fix it.")
                          : "e.g. Low quality poster or invalid date. Please revise."
                      }
                      className="w-full p-3 rounded-xl bg-zinc-900 border border-red-500/40 text-white placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRejecting(false)}
                      className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10"
                    >
                      {language === "fr" ? "Annuler" : "Cancel"}
                    </button>
                    <button
                      type="submit"
                      disabled={moderateMutation.isPending || !rejectReason.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors shadow-lg shadow-red-600/30"
                    >
                      {moderateMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      <span>{language === "fr" ? "Confirmer le refus" : "Confirm Rejection"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Title and Top Details */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {event.title}
            </h1>

            {/* Date & Time pill */}
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-zinc-300">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 font-medium">
                <Calendar className="h-4 w-4 text-purple-400" />
                <span className="capitalize">{formattedStartDate}</span>
                <span className="text-zinc-500">•</span>
                <span className="text-purple-300 font-semibold">{startTime}</span>
              </div>

              {formattedEndDate && (
                <div className="inline-flex items-center gap-1.5 text-zinc-400 text-xs">
                  <span>{tr("jusqu'au", "until")}</span>
                  <span className="text-zinc-300 font-medium">{formattedEndDate}</span>
                </div>
              )}
            </div>

            {/* Venue & Location */}
            {(event.venue || event.city || event.country) && (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <MapPin className="h-4 w-4 text-pink-400 flex-shrink-0" />
                <span className="text-zinc-200 font-medium">
                  {[event.venue, event.city, event.country].filter(Boolean).join(" • ")}
                </span>
                {event.city && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(
                      [event.venue, event.city, event.country].filter(Boolean).join(", ")
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:text-purple-300 underline ml-1 inline-flex items-center gap-1"
                  >
                    <span>{language === "fr" ? "Carte" : "Map"}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* DJ / Organizer Section */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-4">
            {event.artist ? (
              <Link
                href={`/artists/${event.artist.slug}`}
                onClick={onClose}
                className="flex items-center gap-3.5 group/artist min-w-0"
              >
                <div className="relative h-12 w-12 rounded-full overflow-hidden flex-shrink-0 bg-zinc-800 ring-2 ring-purple-500/30">
                  {event.artist.avatarUrl ? (
                    <Image
                      src={event.artist.avatarUrl}
                      alt={event.artist.stageName}
                      fill
                      className="object-cover group-hover/artist:scale-105 transition-transform"
                      sizes="48px"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center font-bold text-white bg-purple-700">
                      {event.artist.stageName[0]}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider">
                      {language === "fr" ? "Artiste / DJ" : "Artist / DJ"}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white group-hover/artist:text-purple-300 transition-colors truncate">
                    {event.artist.stageName}
                  </h4>
                  {event.artist.country && (
                    <p className="text-xs text-zinc-400 truncate">{event.artist.country}</p>
                  )}
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center font-bold text-white text-sm ring-2 ring-white/10 flex-shrink-0">
                  AF
                </div>
                <div className="min-w-0">
                  <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider">
                    {language === "fr" ? "Organisateur" : "Organizer"}
                  </span>
                  <h4 className="text-base font-bold text-white truncate">
                    {event.createdBy?.profile?.displayName || "AfroMix Live"}
                  </h4>
                </div>
              </div>
            )}

            {/* Share action */}
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-zinc-300 hover:text-white transition-all flex-shrink-0"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">{language === "fr" ? "Partager" : "Share"}</span>
            </button>
          </div>

          {/* Description */}
          {event.description && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                {language === "fr" ? "À propos de l'événement" : "About this event"}
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Bottom Actions Bar */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-4">
            {/* Delete button if creator or admin */}
            {(isAdmin || isOwner) && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(event.id, event.title);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>{language === "fr" ? "Supprimer l'événement" : "Delete event"}</span>
              </button>
            )}

            <div className="ml-auto flex items-center gap-3">
              {event.ticketUrl ? (
                <a
                  href={event.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 shadow-xl shadow-purple-600/30 transition-all hover:scale-105 active:scale-95"
                >
                  <Ticket className="h-4 w-4 text-pink-200" />
                  <span>{language === "fr" ? "Acheter un billet / Billetterie" : "Buy Tickets"}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <span className="text-xs text-zinc-500 italic">
                  {language === "fr" ? "Aucune billetterie externe renseignée" : "No external ticketing specified"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
