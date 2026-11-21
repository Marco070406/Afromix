"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Send } from "lucide-react";
import { artistsApi } from "@/app/(frontend)/lib/api/artists";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { BookingStatusBadge, eventTypeLabel } from "@/app/(frontend)/components/artists/booking-inquiries-panel";

/** Onglet Compte : suivi des demandes de booking envoyées aux DJs. Masqué s'il n'y en a aucune. */
export function SentInquiries() {
  const { language, tr } = useI18n();
  const { data } = useQuery({
    queryKey: ["sent-inquiries"],
    queryFn: () => artistsApi.getSentInquiries(),
    staleTime: 60 * 1000,
  });
  const inquiries = data?.data ?? [];
  if (inquiries.length === 0) return null;

  const locale = language === "fr" ? "fr-FR" : "en-US";

  return (
    <div className="rounded-3xl bg-[#111318] border border-white/[0.08] p-6 sm:p-8 space-y-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <Send className="h-4 w-4 text-purple-400" />
        {tr("Mes demandes de booking", "My booking requests")}
      </h3>
      <ul className="space-y-3">
        {inquiries.map((inq) => (
          <li key={inq.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3">
            <span className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0 bg-brand-gradient flex items-center justify-center text-sm font-bold text-white">
              {inq.artist.avatarUrl ? (
                <Image src={inq.artist.avatarUrl} alt="" fill sizes="40px" className="object-cover" />
              ) : (
                inq.artist.stageName[0]?.toUpperCase()
              )}
            </span>
            <div className="min-w-0 flex-1">
              <Link href={`/artists/${inq.artist.slug}`} className="text-sm font-semibold text-white hover:text-purple-300 truncate block">
                {inq.artist.stageName}
              </Link>
              <p className="text-xs text-zinc-400 flex flex-wrap items-center gap-x-2">
                <span>{eventTypeLabel(inq.eventType, language)}</span>
                {inq.eventDate && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(inq.eventDate).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </p>
            </div>
            <BookingStatusBadge status={inq.status} perspective="sender" tr={tr} />
          </li>
        ))}
      </ul>
    </div>
  );
}
