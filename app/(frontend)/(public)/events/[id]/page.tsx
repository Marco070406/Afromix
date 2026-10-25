"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Ticket,
  Share2,
  ArrowLeft,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { eventsApi } from "@/app/(frontend)/lib/api/events";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { toast } from "sonner";

export default function EventDetailPage() {
  const params = useParams();
  const { language, tr } = useI18n();

  const id = params?.id as string;

  const { data: eventData, isLoading, isError } = useQuery({
    queryKey: ["event", id],
    queryFn: () => eventsApi.getById(id),
    enabled: !!id,
  });

  const event = eventData?.data;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <p className="text-sm">
          {language === "fr" ? "Chargement des détails de l'événement..." : "Loading event details..."}
        </p>
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 rounded-3xl bg-white/[0.02] border border-white/[0.08] text-center space-y-4">
        <Calendar className="h-12 w-12 mx-auto text-zinc-600" />
        <h2 className="text-xl font-bold text-white">
          {language === "fr" ? "Événement introuvable" : "Event not found"}
        </h2>
        <p className="text-sm text-zinc-400">
          {language === "fr"
            ? tr("Cet événement n'existe pas ou n'a pas encore été validé par la modération.", "This event doesn't exist or hasn't been approved by moderators yet.")
            : "This event does not exist or has not been approved yet."}
        </p>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{language === "fr" ? "Retour aux événements" : "Back to events"}</span>
        </Link>
      </div>
    );
  }

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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: event.title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success(language === "fr" ? "Lien copié dans le presse-papier" : "Link copied to clipboard");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{language === "fr" ? "Tous les événements" : "All events"}</span>
        </Link>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.10] text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>{language === "fr" ? "Partager" : "Share"}</span>
        </button>
      </div>

      {/* Main card */}
      <div className="rounded-3xl bg-[#111318] border border-white/[0.08] overflow-hidden shadow-2xl">
        {/* Cover Image */}
        <div className="relative h-72 sm:h-96 w-full overflow-hidden bg-zinc-900">
          {event.coverUrl ? (
            <Image
              src={event.coverUrl}
              alt={event.title}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-purple-950 via-zinc-900 to-pink-950 flex items-center justify-center">
              <Calendar className="h-20 w-20 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111318] via-[#111318]/40 to-black/30 pointer-events-none" />

          {/* Status badge */}
          <div className="absolute top-4 left-4 z-10">
            {event.status === "PENDING" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 backdrop-blur-md">
                <Clock className="h-3.5 w-3.5" />
                {language === "fr" ? "En attente de validation admin" : "Pending review"}
              </span>
            )}
            {event.status === "REJECTED" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 border border-red-500/40 text-red-300 backdrop-blur-md">
                <XCircle className="h-3.5 w-3.5" />
                {language === "fr" ? "Événement refusé" : "Rejected"}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-10 space-y-6">
          {/* Rejection Alert if rejected and owner or admin */}
          {event.status === "REJECTED" && event.rejectionReason && (
            <div className="rounded-2xl bg-red-950/40 border border-red-500/30 p-5 flex items-start gap-3.5 text-red-200">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <h4 className="font-bold text-red-300">
                  {language === "fr" ? "Motif du refus :" : "Rejection Reason:"}
                </h4>
                <p className="text-zinc-300 text-xs sm:text-sm whitespace-pre-wrap">
                  {event.rejectionReason}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {event.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 font-medium">
                <Calendar className="h-4 w-4 text-purple-400" />
                <span className="capitalize">{formattedStartDate}</span>
                <span className="text-zinc-500">•</span>
                <span className="text-purple-300 font-semibold">{startTime}</span>
              </div>

              {(event.venue || event.city || event.country) && (
                <div className="inline-flex items-center gap-1.5 text-zinc-400 text-sm">
                  <MapPin className="h-4 w-4 text-pink-400 flex-shrink-0" />
                  <span>{[event.venue, event.city, event.country].filter(Boolean).join(" • ")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Lineup & Organizer */}
          {event.artist && (
            <Link
              href={`/artists/${event.artist.slug}`}
              className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-purple-500/30 flex items-center gap-4 transition-all group"
            >
              <div className="relative h-14 w-14 rounded-full overflow-hidden flex-shrink-0 bg-zinc-800 ring-2 ring-purple-500/30">
                {event.artist.avatarUrl ? (
                  <Image
                    src={event.artist.avatarUrl}
                    alt={event.artist.stageName}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    sizes="56px"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center font-bold text-white bg-purple-700 text-base">
                    {event.artist.stageName[0]}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider">
                  DJ / Headliner
                </span>
                <h4 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                  {event.artist.stageName}
                </h4>
                {event.artist.bio && (
                  <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{event.artist.bio}</p>
                )}
              </div>
            </Link>
          )}

          {/* Description */}
          {event.description && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                {language === "fr" ? "Description" : "Description"}
              </h3>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Ticket CTA */}
          {event.ticketUrl && (
            <div className="pt-6 border-t border-white/[0.08] flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-zinc-400">
                  {language === "fr" ? "Réservation en ligne officielle" : "Official online booking"}
                </p>
                <p className="text-sm font-semibold text-white">
                  {language === "fr" ? "Places limitées disponibles" : "Limited tickets available"}
                </p>
              </div>
              <a
                href={event.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 shadow-xl shadow-purple-600/30 transition-all hover:scale-105 active:scale-95"
              >
                <Ticket className="h-4 w-4 text-pink-200" />
                <span>{language === "fr" ? "Prendre mon billet" : "Get Tickets"}</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
