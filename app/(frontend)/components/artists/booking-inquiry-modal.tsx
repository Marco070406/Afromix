"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  X,
  Calendar,
  MapPin,
  Mail,
  Phone,
  DollarSign,
  Sparkles,
  Send,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { artistsApi, type BookingInquiryData } from "@/app/(frontend)/lib/api/artists";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { toast } from "sonner";
import { useIsClient } from "@/app/(frontend)/hooks/use-is-client";

interface BookingInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  artistSlug: string;
  artistStageName: string;
  artistAvatarUrl?: string | null;
}

const EVENT_TYPES = [
  { id: "CLUB", labelFr: "Soirée Club / Discothèque", labelEn: "Club / Nightclub Night" },
  { id: "FESTIVAL", labelFr: "Festival / Concert grand public", labelEn: "Festival / Public Concert" },
  { id: "WEDDING", labelFr: "Mariage / Cérémonie", labelEn: "Wedding / Ceremony" },
  { id: "PRIVATE", labelFr: "Événement privé / Anniversaire", labelEn: "Private Event / Birthday" },
  { id: "CONCERT", labelFr: "Concert Live / Première partie", labelEn: "Live Show / Opening Act" },
  { id: "OTHER", labelFr: "Autre prestation", labelEn: "Other Performance" },
] as const;

export function BookingInquiryModal({
  isOpen,
  onClose,
  artistSlug,
  artistStageName,
  artistAvatarUrl,
}: BookingInquiryModalProps) {
  const { user } = useAuth();
  const { language, tr } = useI18n();
  const mounted = useIsClient();
  const [senderName, setSenderName] = useState(user?.profile?.displayName || "");
  const [senderEmail, setSenderEmail] = useState(user?.email || "");
  const [senderPhone, setSenderPhone] = useState("");
  const [eventType, setEventType] = useState<BookingInquiryData["eventType"]>("CLUB");
  const [eventDate, setEventDate] = useState("");
  const [eventCity, setEventCity] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!senderName.trim()) {
      toast.error(language === "fr" ? "Veuillez indiquer votre nom" : "Please provide your name");
      return;
    }
    if (!senderEmail.trim()) {
      toast.error(language === "fr" ? "Veuillez indiquer votre email" : "Please provide your email");
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      toast.error(
        language === "fr"
          ? tr("Votre message doit contenir au moins 10 caractères", "Your message must be at least 10 characters")
          : "Message must be at least 10 characters"
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await artistsApi.sendBookingInquiry(artistSlug, {
        senderName: senderName.trim(),
        senderEmail: senderEmail.trim(),
        senderPhone: senderPhone.trim() || undefined,
        eventType,
        eventDate: eventDate ? new Date(eventDate).toISOString() : undefined,
        eventCity: eventCity.trim() || undefined,
        budget: budget.trim() || undefined,
        message: message.trim(),
      });

      setIsSuccess(true);
      toast.success(
        language === "fr"
          ? tr("Demande envoyée avec succès au DJ !", "Request sent to the DJ!")
          : "Booking inquiry sent to the DJ!"
      );
    } catch (err) {
      console.error("Booking inquiry error:", err);
      toast.error(
        (err instanceof Error && err.message) ||
          (language === "fr"
            ? tr("Impossible d'envoyer la demande. Réessayez plus tard.", "Could not send the request. Please try again later.")
            : "Failed to send inquiry. Please try again.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl bg-[#0f1117] border border-white/10 shadow-2xl text-white flex flex-col no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-r from-purple-950/60 via-[#111318] to-pink-950/40 border-b border-white/[0.08]">
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 h-9 w-9 rounded-full bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AfroMix Direct Booking</span>
          </div>

          <div className="flex items-center gap-4 pr-10">
            <span className="relative h-14 w-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-white/10 bg-brand-gradient flex items-center justify-center text-xl font-black text-white">
              {artistAvatarUrl ? (
                <Image src={artistAvatarUrl} alt={artistStageName} fill sizes="56px" className="object-cover" />
              ) : (
                artistStageName[0]?.toUpperCase()
              )}
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {language === "fr" ? `Contacter / Réserver ${artistStageName}` : `Contact / Book ${artistStageName}`}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {language === "fr"
              ? tr("Envoyez une proposition directe. Le DJ recevra un email et une notification instantanée.", "Send a direct offer. The DJ will get an email and an instant notification.")
              : "Send a direct inquiry. The DJ will receive an email and an instant notification."}
          </p>
        </div>

        {isSuccess ? (
          <div className="p-8 sm:p-12 text-center space-y-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white">
              {language === "fr" ? "Message transmis avec succès !" : "Message sent successfully!"}
            </h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              {language === "fr"
                ? `Votre demande a été envoyée à l'équipe de ${artistStageName}. Vous recevrez une réponse directement sur votre adresse email (${senderEmail}).`
                : `Your inquiry has been delivered to ${artistStageName}'s management. You will receive a reply directly at ${senderEmail}.`}
            </p>
            <div className="pt-4">
              <button
                onClick={handleClose}
                className="px-6 py-2.5 rounded-full text-sm font-semibold bg-white/[0.08] hover:bg-white/[0.15] text-white transition-colors"
              >
                {language === "fr" ? "Fermer" : "Close"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
            {/* Sender Info (2 cols) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  {language === "fr" ? "Votre nom ou entité *" : "Your Name / Organization *"}
                </label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder={language === "fr" ? "ex: Marc K. / Club Le Palace" : "e.g. Mark K. / Club Palace"}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  {language === "fr" ? "Votre adresse email *" : "Your Email Address *"}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="contact@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Phone / WhatsApp */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {language === "fr" ? "Numéro WhatsApp / Téléphone (conseillé)" : "WhatsApp / Phone Number (recommended)"}
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="tel"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="+225 07 12 34 56 78 / +33 6 12 34 56 78"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Event Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {language === "fr" ? "Type de prestation *" : "Performance Type *"}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EVENT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setEventType(type.id)}
                    className={`p-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                      eventType === type.id
                        ? "bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-600/10 font-bold"
                        : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    {language === "fr" ? type.labelFr : type.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & City (2 cols) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  {language === "fr" ? "Date de l'événement" : "Event Date"}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  {language === "fr" ? "Ville / Lieu" : "City / Venue"}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={eventCity}
                    onChange={(e) => setEventCity(e.target.value)}
                    placeholder={language === "fr" ? "ex: Lomé, Abidjan, Paris" : "e.g. Lomé, Abidjan, Paris"}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {language === "fr" ? "Budget estimé / Cachet proposé (optionnel)" : "Estimated Budget / Fee Offer (optional)"}
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder={language === "fr" ? "ex: 300 000 FCFA / 1 500 € / À négocier" : "e.g. 500 USD / 1,000 EUR / Negotiable"}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {language === "fr" ? "Détails du projet / Message *" : "Project Details / Message *"}
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  language === "fr"
                    ? tr("Décrivez le contexte de la prestation : durée du set DJ, matériel sur place, ambiance souhaitée...", "Describe the gig: set length, on-site equipment, desired vibe...")
                    : "Describe the event details: set duration, audio gear available, expected vibe..."
                }
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 no-scrollbar resize-none"
              />
            </div>

            {/* Submit Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                {language === "fr" ? "Annuler" : "Cancel"}
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 shadow-lg shadow-purple-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{language === "fr" ? "Envoi en cours..." : "Sending..."}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>{language === "fr" ? "Envoyer la proposition" : "Send Inquiry"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
