"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  UserCheck,
  Users,
  Music2,
  Share2,
  MapPin,
  Globe,
  AtSign,
  Phone,
  Mail,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Edit3,
  Headphones,
  Check,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { artistsApi } from "@/app/(frontend)/lib/api/artists";
import { socialApi } from "@/app/(frontend)/lib/api/social";
import { discoveryApi } from "@/app/(frontend)/lib/api/discovery";
import { Button } from "@/app/(frontend)/components/ui/button";
import { MixCard } from "@/app/(frontend)/components/cards/mix-card";
import { ArtistCard } from "@/app/(frontend)/components/cards/artist-card";
import { Skeleton, MixCardSkeleton } from "@/app/(frontend)/components/ui/skeleton";
import { ErrorState } from "@/app/(frontend)/components/ui/error-state";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { formatCount, genreLabel, cn } from "@/app/(frontend)/lib/utils";
import { BookingInquiryModal } from "@/app/(frontend)/components/artists/booking-inquiry-modal";

export default function ArtistPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { language, tr } = useI18n();
  const queryClient = useQueryClient();
  // null = pas encore d'action locale : on suit l'état serveur
  const [followOverride, setFollowOverride] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"mixes" | "booking" | "about">("mixes");
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bannerErr, setBannerErr] = useState(false);
  const [avatarErr, setAvatarErr] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["artist", slug],
    queryFn: () => artistsApi.getBySlug(slug),
    enabled: !!slug,
  });

  const following = followOverride ?? data?.data?.isFollowing ?? false;

  const { data: mixesData, isLoading: mixesLoading } = useQuery({
    queryKey: ["artist-mixes", slug],
    queryFn: () => artistsApi.getMixes(slug),
    enabled: !!slug,
  });

  const { data: similarData } = useQuery({
    queryKey: ["similar-artists", slug],
    queryFn: () => discoveryApi.similarArtists(slug, 6),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });

  const followMutation = useMutation({
    mutationFn: () => socialApi.toggleFollow(artist!.userId || artist!.id),
    onSuccess: (res) => {
      setFollowOverride(res.data.following);
      queryClient.invalidateQueries({ queryKey: ["artist", slug] });
    },
    onError: () => toast.error(language === "fr" ? "Impossible de suivre" : "Could not follow"),
  });

  const handleShare = async () => {
    const url = `${window.location.origin}/artists/${slug}`;
    if (navigator.share) await navigator.share({ title: artist?.stageName ?? "", url });
    else {
      await navigator.clipboard.writeText(url);
      toast.success(language === "fr" ? "Lien copié !" : "Link copied!");
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-52 bg-white/[0.04]" />
        <div className="px-4 lg:px-8 max-w-5xl mx-auto -mt-14 pb-8">
          <Skeleton className="h-28 w-28 rounded-full mb-4" />
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <ErrorState
        message={language === "fr" ? "Artiste introuvable" : "Artist not found"}
        onRetry={() => refetch()}
      />
    );
  }

  const artist = data.data;
  const mixes = mixesData?.data ?? [];
  const similar = similarData?.data ?? [];
  const isOwner = user && user.id === artist.userId;

  // Clean clean whatsapp digits
  const cleanPhone = artist.bookingPhone ? artist.bookingPhone.replace(/[^0-9]/g, "") : "";
  const whatsappMsg = encodeURIComponent(
    `Bonjour ${artist.stageName}, je vous contacte via AfroMix concernant une prestation / booking.`
  );

  return (
    <div className="pb-12">
      {/* Banner */}
      <div className="relative h-56 sm:h-72 bg-gradient-to-br from-purple-950 via-zinc-900 to-pink-950 overflow-hidden">
        {artist.bannerUrl && !bannerErr && (
          <Image
            src={artist.bannerUrl}
            alt={artist.stageName}
            fill
            className="object-cover opacity-60"
            sizes="100vw"
            priority
            onError={() => setBannerErr(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08090D] via-[#08090D]/40 to-transparent" />
      </div>

      {/* Profile section */}
      <div className="px-4 lg:px-8 max-w-5xl mx-auto -mt-16 sm:-mt-20 relative z-10">
        <div className="flex flex-col sm:flex-row gap-5 mb-6">
          {/* Avatar */}
          <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full overflow-hidden bg-zinc-800 ring-4 ring-[#08090D] shadow-2xl flex-shrink-0">
            {artist.avatarUrl && !avatarErr ? (
              <Image
                src={artist.avatarUrl}
                alt={artist.stageName}
                fill
                className="object-cover"
                sizes="128px"
                priority
                onError={() => setAvatarErr(true)}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-700 to-pink-700 text-4xl font-black text-white">
                {artist.stageName ? artist.stageName[0].toUpperCase() : <Headphones className="h-10 w-10 text-white" />}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="pt-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {artist.stageName}
              </h1>
              {artist.verified && (
                <div className="flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20 font-semibold">
                  <UserCheck className="h-3 w-3" />
                  {language === "fr" ? "Vérifié" : "Verified"}
                </div>
              )}
              {artist.availableForBooking ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {language === "fr" ? "Disponible pour booking" : "Available for booking"}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-purple-400" />
                {formatCount(artist.followerCount)} followers
              </span>
              <span className="flex items-center gap-1.5">
                <Music2 className="h-4 w-4 text-pink-400" />
                {artist.mixCount} mixes
              </span>
              {artist.country && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-amber-400" />
                  {artist.city ? `${artist.city}, ` : ""}
                  {artist.country}
                </span>
              )}
            </div>

            {/* Genres */}
            {artist.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {artist.genres.map((g) => (
                  <span
                    key={g}
                    className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/[0.08] font-medium"
                  >
                    {genreLabel(g, language)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions Block */}
          <div className="flex items-center gap-2 sm:self-start pt-2 flex-wrap">
            {isOwner ? (
              <Link
                href="/dashboard/profile"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/20"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>{language === "fr" ? "Modifier mon profil DJ" : "Edit DJ Profile"}</span>
              </Link>
            ) : (
              <>
                {/* Contact / Book Button */}
                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 shadow-lg shadow-purple-600/25 transition-all hover:scale-105 active:scale-95"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>{language === "fr" ? "Contacter / Réserver" : "Contact / Book"}</span>
                </button>

                {/* Follow Button */}
                {user && (
                  <Button
                    onClick={() => followMutation.mutate()}
                    variant={following ? "secondary" : "default"}
                    isLoading={followMutation.isPending}
                    size="sm"
                  >
                    {following ? (
                      <span className="inline-flex items-center gap-1">
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{language === "fr" ? "Suivi" : "Following"}</span>
                      </span>
                    ) : (
                      language === "fr" ? "Suivre" : "Follow"
                    )}
                  </Button>
                )}
              </>
            )}

            <Button variant="secondary" size="icon" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex gap-2 border-b border-white/[0.06] mb-6 overflow-x-auto no-scrollbar">
          {[
            { id: "mixes" as const, label: `Mixes (${artist.mixCount})` },
            { id: "booking" as const, label: language === "fr" ? "Contact & Booking" : "Contact & Booking" },
            { id: "about" as const, label: language === "fr" ? "À propos" : "About" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-semibold transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "text-white border-b-2 border-purple-500 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Mixes */}
        {activeTab === "mixes" && (
          mixesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <MixCardSkeleton key={i} />
              ))}
            </div>
          ) : mixes.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {mixes.map((mix) => (
                <MixCard key={mix.id} mix={mix} queue={mixes} showArtist={false} />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06] text-zinc-500 text-sm">
              {language === "fr" ? "Aucun mix publié pour l'instant." : "No mixes published yet."}
            </div>
          )
        )}

        {/* Tab 2: Contact & Booking */}
        {activeTab === "booking" && (
          <div className="space-y-6 max-w-3xl animate-fade-in">
            {/* Direct Booking Highlight Card */}
            <div className="rounded-3xl bg-gradient-to-r from-purple-950/40 via-[#111318] to-pink-950/30 border border-white/[0.08] p-6 sm:p-8 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold mb-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{tr("Booking Officiel", "Official Booking")}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {language === "fr"
                      ? `Réserver ${artist.stageName} pour un événement`
                      : `Book ${artist.stageName} for your event`}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                    {language === "fr"
                      ? tr("Festivals, soirées clubs, mariages, showcases et événements privés.", "Festivals, club nights, weddings, showcases and private events.")
                      : "Festivals, club nights, weddings, showcases, and private events."}
                  </p>
                </div>

                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 shadow-xl shadow-purple-600/30 transition-all hover:scale-105 active:scale-95"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{language === "fr" ? "Envoyer une proposition" : "Send an Inquiry"}</span>
                </button>
              </div>

              {/* Direct channels grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* WhatsApp button if phone provided */}
                {cleanPhone ? (
                  <a
                    href={`https://wa.me/${cleanPhone}?text=${whatsappMsg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-between text-emerald-300 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                          WhatsApp Direct
                        </p>
                        <p className="text-xs text-zinc-400">{artist.bookingPhone}</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </a>
                ) : null}

                {/* Email Booking */}
                {artist.bookingEmail ? (
                  <a
                    href={`mailto:${artist.bookingEmail}?subject=Demande%20de%20booking%20AfroMix%20-%20${encodeURIComponent(
                      artist.stageName
                    )}`}
                    className="p-4 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 flex items-center justify-between text-purple-300 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                          Email Booking
                        </p>
                        <p className="text-xs text-zinc-400 truncate max-w-[180px]">
                          {artist.bookingEmail}
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </a>
                ) : null}
              </div>

              {/* Booking Notes */}
              {artist.bookingNotes && (
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    {language === "fr" ? "Conditions & Prestations" : "Conditions & Performances"}
                  </p>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {artist.bookingNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: About */}
        {activeTab === "about" && (
          <div className="space-y-6 max-w-3xl animate-fade-in">
            {/* Bio */}
            {artist.bio ? (
              <div className="rounded-3xl bg-[#111318] border border-white/[0.08] p-6 sm:p-8 space-y-3">
                <h3 className="text-base font-bold text-white">
                  {language === "fr" ? "Biographie" : "Biography"}
                </h3>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {artist.bio}
                </p>
              </div>
            ) : null}

            {/* Social and Web Links */}
            <div className="rounded-3xl bg-[#111318] border border-white/[0.08] p-6 sm:p-8 space-y-4">
              <h3 className="text-base font-bold text-white">
                {language === "fr" ? "Réseaux Sociaux & Liens" : "Social Links & Web"}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {artist.website && (
                  <a
                    href={artist.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] flex items-center justify-between text-sm text-zinc-300 hover:text-white transition-all group"
                  >
                    <span className="flex items-center gap-2.5">
                      <Globe className="h-4 w-4 text-purple-400" /> Site web officiel
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-zinc-500 group-hover:text-white" />
                  </a>
                )}
                {artist.instagram && (
                  <a
                    href={
                      artist.instagram.startsWith("http")
                        ? artist.instagram
                        : `https://instagram.com/${artist.instagram.replace("@", "")}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] flex items-center justify-between text-sm text-zinc-300 hover:text-white transition-all group"
                  >
                    <span className="flex items-center gap-2.5">
                      <AtSign className="h-4 w-4 text-pink-400" /> Instagram
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-zinc-500 group-hover:text-white" />
                  </a>
                )}
                {artist.tiktok && (
                  <a
                    href={
                      artist.tiktok.startsWith("http")
                        ? artist.tiktok
                        : `https://tiktok.com/@${artist.tiktok.replace("@", "")}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] flex items-center justify-between text-sm text-zinc-300 hover:text-white transition-all group"
                  >
                    <span className="flex items-center gap-2.5">
                      <AtSign className="h-4 w-4 text-cyan-400" /> TikTok
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-zinc-500 group-hover:text-white" />
                  </a>
                )}
                {artist.twitter && (
                  <a
                    href={
                      artist.twitter.startsWith("http")
                        ? artist.twitter
                        : `https://twitter.com/${artist.twitter.replace("@", "")}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] flex items-center justify-between text-sm text-zinc-300 hover:text-white transition-all group"
                  >
                    <span className="flex items-center gap-2.5">
                      <AtSign className="h-4 w-4 text-sky-400" /> Twitter / X
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-zinc-500 group-hover:text-white" />
                  </a>
                )}
                {artist.youtube && (
                  <a
                    href={artist.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] flex items-center justify-between text-sm text-zinc-300 hover:text-white transition-all group"
                  >
                    <span className="flex items-center gap-2.5">
                      <Globe className="h-4 w-4 text-red-500" /> YouTube
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-zinc-500 group-hover:text-white" />
                  </a>
                )}
                {artist.soundcloud && (
                  <a
                    href={artist.soundcloud}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] flex items-center justify-between text-sm text-zinc-300 hover:text-white transition-all group"
                  >
                    <span className="flex items-center gap-2.5">
                      <Music2 className="h-4 w-4 text-amber-500" /> SoundCloud
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-zinc-500 group-hover:text-white" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Similar artists */}
        {similar.length > 0 && (
          <section className="mt-12 pt-8 border-t border-white/[0.06]">
            <h2 className="text-lg font-bold text-white mb-4">
              {language === "fr" ? "Artistes similaires" : "Similar Artists"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {similar.map((a) => (
                <ArtistCard key={a.id} artist={a} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Booking Inquiry Modal */}
      <BookingInquiryModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        artistSlug={artist.slug}
        artistStageName={artist.stageName}
      />
    </div>
  );
}
