"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  ExternalLink,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  Ticket,
  Clock,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { eventsApi } from "@/app/(frontend)/lib/api/events";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { CreateEventModal } from "@/app/(frontend)/components/events/create-event-modal";
import { EventDetailModal } from "@/app/(frontend)/components/events/event-detail-modal";
import { toast } from "sonner";
import type { EventItem } from "@/types/api";

export default function EventsPage() {
  const { t, language, tr } = useI18n();
  const { user, isArtist, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCountry, setSelectedCountry] = useState<string>("ALL");
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canCreate = isArtist || isAdmin;

  const { data: eventsData, isLoading, isError } = useQuery({
    queryKey: ["events", adminStatusFilter],
    queryFn: () => eventsApi.list(isAdmin ? { status: adminStatusFilter } : undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.delete(id),
    onSuccess: () => {
      toast.success(
        language === "fr" ? "Événement supprimé avec succès" : "Event deleted successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setDeletingId(null);
      if (selectedEvent?.id === deletingId) {
        setIsDetailOpen(false);
        setSelectedEvent(null);
      }
    },
    onError: () => {
      toast.error(
        language === "fr" ? "Erreur lors de la suppression" : "Failed to delete event"
      );
      setDeletingId(null);
    },
  });

  const handleDelete = (id: string, title: string) => {
    const confirmMsg =
      language === "fr"
        ? `Êtes-vous sûr de vouloir supprimer l'événement "${title}" ?`
        : `Are you sure you want to delete "${title}"?`;
    if (confirm(confirmMsg)) {
      setDeletingId(id);
      deleteMutation.mutate(id);
    }
  };

  const handleOpenDetail = (evt: EventItem) => {
    setSelectedEvent(evt);
    setIsDetailOpen(true);
  };

  const events = eventsData?.data ?? [];

  // Count pending for admin badge
  const pendingCount = events.filter((e) => e.status === "PENDING").length;

  const countries = ["ALL", ...Array.from(new Set(events.map((e) => e.country).filter(Boolean)))];

  const filteredEvents =
    selectedCountry === "ALL"
      ? events
      : events.filter((e) => e.country === selectedCountry);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, "0");
    const month = d
      .toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", { month: "short" })
      .toUpperCase();
    const time = d.toLocaleTimeString(language === "fr" ? "fr-FR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { day, month, time };
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="relative rounded-3xl p-6 sm:p-10 overflow-hidden bg-gradient-to-r from-purple-950/60 via-[#111318] to-pink-950/40 border border-white/[0.08] shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AfroMix Live Sessions & IRL Festivals</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            {t("nav.events")} & Concerts DJ
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            {language === "fr"
              ? "Vivez la vibe afro en direct. Retrouvez les dates de tournée de vos DJs préférés à Lomé, Accra, Lagos, Abidjan et Paris."
              : "Experience the real afro nightlife live. Check out upcoming tour dates for your favorite DJs in Lomé, Accra, Lagos, Abidjan and Paris."}
          </p>
        </div>

        {/* Create Event CTA for DJ & Admin */}
        {canCreate && (
          <div className="relative z-10 flex-shrink-0">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 shadow-xl shadow-purple-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="h-5 w-5" />
              <span>{language === "fr" ? "Créer un événement" : "Create Event"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Admin Moderation Tabs */}
      {isAdmin && (
        <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-purple-300">
            <ShieldCheck className="h-4 w-4 text-purple-400" />
            <span>{language === "fr" ? "Modération Administrateur :" : "Admin Moderation:"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "ALL", labelFr: "Tous les événements", labelEn: "All Events" },
              {
                id: "PENDING",
                labelFr: `En attente (${pendingCount})`,
                labelEn: `Pending (${pendingCount})`,
                alert: pendingCount > 0,
              },
              { id: "APPROVED", labelFr: "Validés", labelEn: "Approved" },
              { id: "REJECTED", labelFr: "Rejetés", labelEn: "Rejected" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setAdminStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  adminStatusFilter === tab.id
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : tab.alert
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                    : "bg-white/[0.05] text-zinc-400 hover:text-white hover:bg-white/[0.10]"
                }`}
              >
                {language === "fr" ? tab.labelFr : tab.labelEn}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Chips by Country */}
      {countries.length > 2 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {countries.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCountry(c as string)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCountry === c
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                  : "bg-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.10]"
              }`}
            >
              {c === "ALL" ? (language === "fr" ? "Tous les pays" : "All countries") : c}
            </button>
          ))}
        </div>
      )}

      {/* Events Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-500">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-sm">
            {language === "fr" ? "Chargement des événements..." : "Loading events..."}
          </p>
        </div>
      ) : isError || filteredEvents.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-white/[0.02] border border-white/[0.05] p-8 space-y-4">
          <Calendar className="h-12 w-12 mx-auto text-zinc-600" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">
              {language === "fr" ? "Aucun événement à afficher" : "No events to display"}
            </h3>
            <p className="text-sm text-zinc-500 max-w-md mx-auto">
              {language === "fr"
                ? tr("Revenez bientôt pour de nouvelles dates de festivals et tournées.", "Check back soon for new festival and tour dates.")
                : "Check back soon for new festival dates and tours."}
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/20"
            >
              <Plus className="h-4 w-4" />
              <span>{language === "fr" ? "Créer un événement" : "Create Event"}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((evt) => {
            const { day, month, time } = formatDate(evt.startAt);
            const isOwner = user && evt.createdById === user.id;
            const canDelete = isAdmin || isOwner;

            return (
              <div
                key={evt.id}
                onClick={() => handleOpenDetail(evt)}
                className="group cursor-pointer rounded-3xl bg-[#111318] border border-white/[0.08] overflow-hidden hover:border-purple-500/40 hover:shadow-2xl hover:shadow-purple-950/25 transition-all duration-300 flex flex-col hover:-translate-y-1"
              >
                {/* Image Cover */}
                <div className="relative h-48 w-full overflow-hidden bg-zinc-900">
                  {evt.coverUrl ? (
                    <Image
                      src={evt.coverUrl}
                      alt={evt.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
                      <Calendar className="h-12 w-12 text-white/30" />
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111318] via-transparent to-black/30 pointer-events-none" />

                  {/* Big Date Badge */}
                  <div className="absolute top-4 left-4 rounded-2xl bg-black/75 backdrop-blur-md border border-white/20 px-3 py-2 text-center shadow-lg min-w-[56px]">
                    <span className="block text-2xl font-black text-white leading-none">{day}</span>
                    <span className="block text-[11px] font-bold text-pink-400 uppercase tracking-wider mt-0.5">
                      {month}
                    </span>
                  </div>

                  {/* Status Indicator Badge (Pending / Rejected) */}
                  {evt.status === "PENDING" && (
                    <div className="absolute bottom-3 left-4 z-10">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/90 text-black shadow-md backdrop-blur-md">
                        <Clock className="h-3 w-3" />
                        <span>{language === "fr" ? "En attente de validation" : "Pending review"}</span>
                      </span>
                    </div>
                  )}
                  {evt.status === "REJECTED" && (
                    <div className="absolute bottom-3 left-4 z-10">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-red-600 text-white shadow-md backdrop-blur-md">
                        <XCircle className="h-3 w-3" />
                        <span>{language === "fr" ? "Refusé (cliquer)" : "Rejected"}</span>
                      </span>
                    </div>
                  )}

                  {/* Delete Button for admin or owner */}
                  {canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(evt.id, evt.title);
                      }}
                      disabled={deletingId === evt.id}
                      title={language === "fr" ? "Supprimer l'événement" : "Delete event"}
                      className="absolute top-4 right-4 h-9 w-9 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-zinc-400 hover:text-red-400 hover:bg-black/90 flex items-center justify-center transition-colors shadow-lg z-10"
                    >
                      {deletingId === evt.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                        {evt.title}
                      </h2>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 whitespace-nowrap">
                        {time}
                      </span>
                    </div>

                    {(evt.venue || evt.city || evt.country) && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <MapPin className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                        <span className="truncate">
                          {[evt.venue, evt.city, evt.country].filter(Boolean).join(" • ")}
                        </span>
                      </div>
                    )}

                    {evt.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {evt.description}
                      </p>
                    )}
                  </div>

                  {/* Artist Lineup & Actions */}
                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
                    {evt.artist ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <Link
                          href={`/artists/${evt.artist.slug}`}
                          className="flex items-center gap-2 group/art hover:opacity-90 transition-opacity min-w-0"
                        >
                          <div className="relative h-7 w-7 rounded-full overflow-hidden flex-shrink-0 bg-zinc-800 ring-1 ring-white/10">
                            {evt.artist.avatarUrl ? (
                              <Image
                                src={evt.artist.avatarUrl}
                                alt={evt.artist.stageName}
                                fill
                                className="object-cover"
                                sizes="28px"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-white bg-purple-700">
                                {evt.artist.stageName[0]}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-medium text-zinc-300 truncate group-hover/art:text-white">
                            {evt.artist.stageName}
                          </span>
                        </Link>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-white/10">
                          AF
                        </div>
                        <span className="text-xs font-medium text-zinc-400 truncate">
                          {evt.createdBy?.profile?.displayName || "AfroMix Event"}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* If Admin and pending, quick moderation button */}
                      {isAdmin && evt.status === "PENDING" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(evt);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-colors shadow-md"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>{language === "fr" ? "Modérer" : "Review"}</span>
                        </button>
                      )}

                      {/* Ticket Link Button */}
                      {evt.ticketUrl && (
                        <a
                          href={evt.ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-white hover:text-purple-300 transition-colors"
                        >
                          <Ticket className="h-3.5 w-3.5 text-pink-400" />
                          <span>{language === "fr" ? "Billets" : "Tickets"}</span>
                          <ExternalLink className="h-3 w-3 text-zinc-400" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal to create event */}
      <CreateEventModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />

      {/* Modal to view event details and moderate */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedEvent(null);
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}
