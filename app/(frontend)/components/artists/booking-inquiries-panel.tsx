"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar, Check, Clock, DollarSign, Eye, Inbox, Loader2, Mail, MapPin, MessageSquare, Phone, RotateCcw, X,
} from "lucide-react";
import { toast } from "sonner";
import { artistsApi, type BookingInquiry, type BookingStatus } from "@/app/(frontend)/lib/api/artists";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { EVENT_TYPES } from "@/app/(frontend)/components/artists/booking-inquiry-modal";
import { cn } from "@/app/(frontend)/lib/utils";

type Tr = (fr: string, en: string) => string;
type Filter = "TODO" | "ACCEPTED" | "DECLINED" | "ALL";
type Decision = "ACCEPTED" | "DECLINED";

const isTodo = (status: BookingStatus) => status === "PENDING" || status === "READ";

export function eventTypeLabel(type: string, language: string): string {
  const t = EVENT_TYPES.find((e) => e.id === type);
  return t ? (language === "fr" ? t.labelFr : t.labelEn) : type;
}

/** Statut d'une demande, formulé pour le DJ ou pour l'organisateur. */
export function BookingStatusBadge({ status, perspective, tr }: { status: BookingStatus; perspective: "dj" | "sender"; tr: Tr }) {
  const styles: Record<BookingStatus, { label: string; className: string }> = {
    PENDING: {
      label: perspective === "dj" ? tr("Nouvelle", "New") : tr("Envoyée", "Sent"),
      className: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    },
    READ: {
      label: perspective === "dj" ? tr("À traiter", "To handle") : tr("Vue par le DJ", "Seen by the DJ"),
      className: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    },
    ACCEPTED: { label: tr("Acceptée", "Accepted"), className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
    DECLINED: { label: tr("Déclinée", "Declined"), className: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
  };
  const { label, className } = styles[status];
  return <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold border whitespace-nowrap", className)}>{label}</span>;
}

/** Onglet « Demandes reçues » du profil DJ : tri, lecture, acceptation ou refus avec message. */
export function BookingInquiriesPanel({ inquiries, isLoading }: { inquiries: BookingInquiry[]; isLoading: boolean }) {
  const { tr } = useI18n();
  const [filter, setFilter] = useState<Filter>("TODO");

  const counts: Record<Filter, number> = {
    TODO: inquiries.filter((i) => isTodo(i.status)).length,
    ACCEPTED: inquiries.filter((i) => i.status === "ACCEPTED").length,
    DECLINED: inquiries.filter((i) => i.status === "DECLINED").length,
    ALL: inquiries.length,
  };
  const visible = inquiries.filter((i) =>
    filter === "ALL" ? true : filter === "TODO" ? isTodo(i.status) : i.status === filter
  );
  const filters: { id: Filter; label: string }[] = [
    { id: "TODO", label: tr("À traiter", "To handle") },
    { id: "ACCEPTED", label: tr("Acceptées", "Accepted") },
    { id: "DECLINED", label: tr("Déclinées", "Declined") },
    { id: "ALL", label: tr("Toutes", "All") },
  ];

  return (
    <div className="rounded-3xl bg-[#111318] border border-white/[0.08] p-6 sm:p-8 space-y-6">
      <div>
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Inbox className="h-4 w-4 text-purple-400" />
          <span>{tr("Demandes de booking reçues", "Received booking inquiries")}</span>
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          {tr(
            "Acceptez ou déclinez chaque demande : l'organisateur est prévenu par e-mail, avec votre message.",
            "Accept or decline each request: the organiser is notified by email, with your message."
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label={tr("Filtrer les demandes", "Filter inquiries")}>
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors",
              filter === f.id
                ? "bg-purple-600 border-purple-500 text-white"
                : "bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:text-white"
            )}
          >
            {f.label} ({counts[f.id]})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-500" />
        </div>
      ) : visible.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-3">
          <MessageSquare className="h-10 w-10 text-zinc-600 mx-auto" />
          <p className="text-sm font-semibold text-white">
            {inquiries.length === 0
              ? tr("Aucune demande reçue pour l'instant", "No inquiries yet")
              : tr("Aucune demande dans cette catégorie", "No inquiries in this category")}
          </p>
          {inquiries.length === 0 && (
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {tr(
                "Partagez votre profil public AfroMix pour recevoir des propositions de clubs, mariages et festivals !",
                "Share your public AfroMix profile to start receiving booking requests!"
              )}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((inq) => (
            <InquiryCard key={inq.id} inquiry={inq} />
          ))}
        </div>
      )}
    </div>
  );
}

function InquiryCard({ inquiry: inq }: { inquiry: BookingInquiry }) {
  const { language, tr } = useI18n();
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reply, setReply] = useState("");

  const mutation = useMutation({
    mutationFn: (input: { status: BookingStatus; reply?: string }) => artistsApi.updateInquiry(inq.id, input),
    onSuccess: (res, input) => {
      queryClient.invalidateQueries({ queryKey: ["my-booking-inquiries"] });
      setDecision(null);
      setReply("");
      if (input.status === "ACCEPTED" || input.status === "DECLINED") {
        toast.success(
          res.data.notified
            ? tr("Réponse envoyée à l'organisateur", "Reply sent to the organiser")
            : tr("Décision enregistrée", "Decision saved")
        );
      }
    },
    onError: (err: Error) => toast.error(err.message || tr("Impossible de mettre à jour la demande", "Could not update the inquiry")),
  });

  const locale = language === "fr" ? "fr-FR" : "en-US";
  const eventDate = inq.eventDate
    ? new Date(inq.eventDate).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
    : null;
  const receivedAt = new Date(inq.createdAt).toLocaleDateString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const busy = mutation.isPending;

  return (
    <div
      className={cn(
        "p-5 rounded-2xl bg-white/[0.03] border transition-all space-y-3",
        inq.status === "PENDING" ? "border-amber-500/30" : "border-white/[0.06] hover:border-purple-500/30"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0 bg-brand-gradient flex items-center justify-center text-sm font-bold text-white">
            {inq.sender?.profile?.avatarUrl ? (
              <Image src={inq.sender.profile.avatarUrl} alt="" fill sizes="40px" className="object-cover" />
            ) : (
              inq.senderName[0]?.toUpperCase()
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-white">{inq.senderName}</span>
              <BookingStatusBadge status={inq.status} perspective="dj" tr={tr} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 mt-1">
              <a href={`mailto:${inq.senderEmail}`} className="hover:text-purple-400 transition-colors flex items-center gap-1 min-w-0">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{inq.senderEmail}</span>
              </a>
              {inq.senderPhone && (
                <a href={`tel:${inq.senderPhone}`} className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {inq.senderPhone}
                </a>
              )}
            </div>
          </div>
        </div>
        <span className="text-[11px] text-zinc-500 flex items-center gap-1 flex-shrink-0">
          <Clock className="h-3 w-3" />
          {receivedAt}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-300 px-2.5 py-1 rounded-lg">
          {eventTypeLabel(inq.eventType, language)}
        </span>
        {eventDate && (
          <span className="inline-flex items-center gap-1 bg-white/[0.04] px-2.5 py-1 rounded-lg">
            <Calendar className="h-3.5 w-3.5 text-purple-400" />
            {eventDate}
          </span>
        )}
        {inq.eventCity && (
          <span className="inline-flex items-center gap-1 bg-white/[0.04] px-2.5 py-1 rounded-lg">
            <MapPin className="h-3.5 w-3.5 text-pink-400" />
            {inq.eventCity}
          </span>
        )}
        {inq.budget && (
          <span className="inline-flex items-center gap-1 bg-white/[0.04] px-2.5 py-1 rounded-lg">
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            {inq.budget}
          </span>
        )}
      </div>

      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/[0.04] whitespace-pre-wrap">
        {inq.message}
      </p>

      {decision ? (
        <div className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <label htmlFor={`reply-${inq.id}`} className="block text-xs font-semibold text-zinc-300">
            {decision === "ACCEPTED"
              ? tr("Message pour confirmer (facultatif)", "Confirmation message (optional)")
              : tr("Message pour décliner (facultatif)", "Decline message (optional)")}
          </label>
          <textarea
            id={`reply-${inq.id}`}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={
              decision === "ACCEPTED"
                ? tr("Ex : Avec plaisir ! Je vous appelle demain pour les détails.", "E.g. With pleasure! I'll call you tomorrow to discuss details.")
                : tr("Ex : Merci, mais je suis déjà pris à cette date.", "E.g. Thank you, but I'm already booked on that date.")
            }
            className="w-full rounded-xl bg-[#181a20] border border-white/10 text-sm text-white p-3 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-y"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => mutation.mutate({ status: decision, reply: reply.trim() || undefined })}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white transition-colors disabled:opacity-60",
                decision === "ACCEPTED" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-zinc-600 hover:bg-zinc-500"
              )}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : decision === "ACCEPTED" ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {decision === "ACCEPTED" ? tr("Confirmer l'acceptation", "Confirm acceptance") : tr("Confirmer le refus", "Confirm decline")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => { setDecision(null); setReply(""); }}
              className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-400 hover:text-white"
            >
              {tr("Annuler", "Cancel")}
            </button>
            <span className="text-[11px] text-zinc-500">{reply.length}/1000</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {isTodo(inq.status) ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => setDecision("ACCEPTED")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" />
                {tr("Accepter", "Accept")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setDecision("DECLINED")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10 transition-colors disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" />
                {tr("Décliner", "Decline")}
              </button>
              {inq.status === "PENDING" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => mutation.mutate({ status: "READ" })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white transition-colors disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                  {tr("Marquer comme lue", "Mark as read")}
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => mutation.mutate({ status: "READ" })}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white transition-colors disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              {tr("Remettre à traiter", "Move back to handle")}
            </button>
          )}
          <span className="flex-1" />
          <a
            href={`mailto:${inq.senderEmail}?subject=Re:%20Votre%20demande%20de%20booking%20AfroMix`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            {tr("E-mail", "Email")}
          </a>
          {inq.senderPhone && (
            <a
              href={`https://wa.me/${inq.senderPhone.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
}
