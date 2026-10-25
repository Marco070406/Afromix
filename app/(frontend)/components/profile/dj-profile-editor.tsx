"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Sparkles,
  Camera,
  Check,
  ExternalLink,
  MessageSquare,
  DollarSign,
  ShieldCheck,
  Save,
  Loader2,
  AlertCircle,
  Inbox,
  Clock,
} from "lucide-react";
import { artistsApi, type ArtistProfileUpdate } from "@/app/(frontend)/lib/api/artists";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { toast } from "sonner";
import { GENRE_LABELS, countryName } from "@/app/(frontend)/lib/utils";

const AFRICAN_COUNTRIES = [
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "ZA", name: "Afrique du Sud" },
  { code: "TG", name: "Togo" },
  { code: "BJ", name: "Bénin" },
  { code: "SN", name: "Sénégal" },
  { code: "CM", name: "Cameroun" },
  { code: "CD", name: "RD Congo" },
  { code: "CG", name: "Congo" },
  { code: "KE", name: "Kenya" },
  { code: "TZ", name: "Tanzanie" },
  { code: "BF", name: "Burkina Faso" },
  { code: "ML", name: "Mali" },
  { code: "GN", name: "Guinée" },
  { code: "GA", name: "Gabon" },
  { code: "RW", name: "Rwanda" },
  { code: "FR", name: "France" },
  { code: "BE", name: "Belgique" },
  { code: "GB", name: "Royaume-Uni" },
  { code: "US", name: "États-Unis" },
  { code: "CA", name: "Canada" },
];

export function DjProfileEditor() {
  const { language, tr } = useI18n();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"profile" | "contact" | "inquiries">("profile");

  // Form state
  const [stageName, setStageName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [soundcloud, setSoundcloud] = useState("");
  const [twitter, setTwitter] = useState("");
  const [youtube, setYoutube] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [spotify, setSpotify] = useState("");
  const [genres, setGenres] = useState<string[]>([]);

  // Booking & Contact state
  const [bookingEmail, setBookingEmail] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [availableForBooking, setAvailableForBooking] = useState(true);

  // Avatar & Banner upload state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch current artist profile
  const { data: artistData, isLoading, isError } = useQuery({
    queryKey: ["my-artist-profile"],
    queryFn: () => artistsApi.getMyProfile(),
  });

  // 2. Fetch booking inquiries
  const { data: inquiriesData, isLoading: inquiriesLoading } = useQuery({
    queryKey: ["my-booking-inquiries"],
    queryFn: () => artistsApi.getMyInquiries(),
  });

  const artist = artistData?.data;
  const inquiries = inquiriesData?.data ?? [];

  // Remplit le formulaire quand le profil serveur arrive ou change (ajustement pendant le rendu)
  const [syncedArtist, setSyncedArtist] = useState<typeof artist | null>(null);
  if (artist !== syncedArtist) {
    setSyncedArtist(artist);
    if (artist) {
      setStageName(artist.stageName || "");
      setBio(artist.bio || "");
      setCountry(artist.country || "");
      setCity(artist.city || "");
      setWebsite(artist.website || "");
      setInstagram(artist.instagram || "");
      setSoundcloud(artist.soundcloud || "");
      setTwitter(artist.twitter || "");
      setYoutube(artist.youtube || "");
      setTiktok(artist.tiktok || "");
      setSpotify(artist.spotify || "");
      setGenres(artist.genres || []);
      setBookingEmail(artist.bookingEmail || "");
      setBookingPhone(artist.bookingPhone || "");
      setBookingNotes(artist.bookingNotes || "");
      setAvailableForBooking(artist.availableForBooking ?? true);
      setAvatarUrl(artist.avatarUrl || null);
      setBannerUrl(artist.bannerUrl || null);
    }
  }

  // Upload Avatar helper
  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error(language === "fr" ? "Format JPEG, PNG ou WebP requis" : "JPEG, PNG, or WebP required");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(language === "fr" ? "Image trop lourde (max 10 Mo)" : "Image too large (max 10 MB)");
      return;
    }

    try {
      setAvatarUploading(true);
      const presign = await artistsApi.presignAvatar(file.name, file.type);
      const { uploadUrl, cdnUrl } = presign.data;

      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      setAvatarUrl(cdnUrl);
      toast.success(language === "fr" ? "Photo de profil téléchargée !" : "Avatar uploaded!");
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error(language === "fr" ? "Erreur upload photo de profil" : "Failed to upload avatar");
    } finally {
      setAvatarUploading(false);
    }
  };

  // Upload Banner helper
  const handleBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error(language === "fr" ? "Format JPEG, PNG ou WebP requis" : "JPEG, PNG, or WebP required");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(language === "fr" ? "Image trop lourde (max 10 Mo)" : "Image too large (max 10 MB)");
      return;
    }

    try {
      setBannerUploading(true);
      const presign = await artistsApi.presignBanner(file.name, file.type);
      const { uploadUrl, cdnUrl } = presign.data;

      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      setBannerUrl(cdnUrl);
      toast.success(language === "fr" ? "Bannière téléchargée !" : "Banner uploaded!");
    } catch (err) {
      console.error("Banner upload error:", err);
      toast.error(language === "fr" ? "Erreur upload bannière" : "Failed to upload banner");
    } finally {
      setBannerUploading(false);
    }
  };

  // Toggle Genre
  const handleToggleGenre = (g: string) => {
    if (genres.includes(g)) {
      setGenres(genres.filter((item) => item !== g));
    } else {
      if (genres.length >= 6) {
        toast.error(language === "fr" ? "Maximum 6 genres musicaux" : "Maximum 6 genres");
        return;
      }
      setGenres([...genres, g]);
    }
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: ArtistProfileUpdate) => artistsApi.updateMyProfile(data),
    onSuccess: (res) => {
      toast.success(
        language === "fr"
          ? tr("Profil DJ mis à jour avec succès !", "DJ profile updated!")
          : "DJ profile updated successfully!"
      );
      queryClient.invalidateQueries({ queryKey: ["my-artist-profile"] });
      queryClient.invalidateQueries({ queryKey: ["artist", res.data.slug] });
    },
    onError: (err: Error) => {
      console.error("Save DJ profile error:", err);
      toast.error(
        err?.message || (language === "fr" ? "Erreur lors de la sauvegarde" : "Failed to save profile")
      );
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!stageName.trim()) {
      toast.error(language === "fr" ? "Le nom de scène est obligatoire" : "Stage name is required");
      return;
    }

    saveMutation.mutate({
      stageName: stageName.trim(),
      bio: bio.trim(),
      country: country || undefined,
      city: city.trim() || undefined,
      website: website.trim() || undefined,
      instagram: instagram.trim() || undefined,
      soundcloud: soundcloud.trim() || undefined,
      twitter: twitter.trim() || undefined,
      youtube: youtube.trim() || undefined,
      tiktok: tiktok.trim() || undefined,
      spotify: spotify.trim() || undefined,
      genres,
      bookingEmail: bookingEmail.trim() || undefined,
      bookingPhone: bookingPhone.trim() || undefined,
      bookingNotes: bookingNotes.trim() || undefined,
      availableForBooking,
      avatarUrl: avatarUrl || undefined,
      bannerUrl: bannerUrl || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-zinc-400 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
        <p className="text-sm">
          {language === "fr" ? "Chargement de votre profil DJ..." : "Loading DJ profile..."}
        </p>
      </div>
    );
  }

  if (isError || !artist) {
    return (
      <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/[0.08] text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">
          {language === "fr" ? "Profil DJ non trouvé" : "DJ Profile not found"}
        </h3>
        <p className="text-sm text-zinc-400">
          {language === "fr"
            ? tr("Ce compte n'est pas encore associé à un profil artiste actif.", "This account isn't linked to an active artist profile yet.")
            : "This account is not associated with an active artist profile."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Header info */}
      <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] bg-[#111318] shadow-2xl">
        {/* Banner area */}
        <div className="relative h-44 sm:h-56 w-full bg-zinc-900 group">
          {bannerUrl ? (
            <Image
              src={bannerUrl}
              alt={stageName || "Banner"}
              fill
              className="object-cover"
              sizes="100vw"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-purple-950 via-zinc-900 to-pink-950 flex items-center justify-center">
              <Sparkles className="h-12 w-12 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111318] via-transparent to-black/30 pointer-events-none" />

          {/* Change Banner Button */}
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            disabled={bannerUploading}
            className="absolute top-4 right-4 z-10 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-black/75 hover:bg-black/90 backdrop-blur-md text-white border border-white/20 shadow-lg transition-all"
          >
            {bannerUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
            <span>
              {bannerUrl
                ? language === "fr"
                  ? tr("Changer la bannière", "Change banner")
                  : "Change banner"
                : language === "fr"
                ? tr("Ajouter une bannière", "Add a banner")
                : "Add banner"}
            </span>
          </button>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleBannerFile}
          />
        </div>

        {/* Profile info bar */}
        <div className="p-6 sm:p-8 -mt-16 sm:-mt-20 relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
            {/* Avatar with upload trigger */}
            <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full overflow-hidden bg-zinc-800 ring-4 ring-[#111318] shadow-2xl flex-shrink-0 group">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={stageName}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-700 to-pink-700 text-3xl font-black text-white">
                  {stageName?.[0]?.toUpperCase() || "DJ"}
                </div>
              )}

              {/* Avatar hover overlay */}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity text-xs font-semibold gap-1"
              >
                {avatarUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-5 w-5" />
                    <span>{language === "fr" ? "Modifier" : "Change"}</span>
                  </>
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarFile}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {stageName || tr("Nom de scène DJ", "DJ stage name")}
                </h2>
                {artist.verified && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold">
                    <ShieldCheck className="h-3 w-3" />
                    {language === "fr" ? "Vérifié" : "Verified"}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                afromix.io/artists/<span className="text-purple-400 font-semibold">{artist.slug}</span>
              </p>
              {availableForBooking ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {language === "fr" ? "Disponible pour bookings" : "Available for bookings"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="h-2 w-2 rounded-full bg-zinc-500" />
                  {language === "fr" ? "Non disponible pour bookings" : "Not available for bookings"}
                </span>
              )}
            </div>
          </div>

          {/* Action: Open Public Profile */}
          <div className="flex items-center justify-center gap-3">
            <Link
              href={`/artists/${artist.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.10] text-zinc-200 hover:text-white border border-white/10 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{language === "fr" ? "Voir mon profil public" : "View Public Profile"}</span>
            </Link>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="px-6 border-t border-white/[0.06] flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            {
              id: "profile" as const,
              labelFr: "Profil & Musique",
              labelEn: "Profile & Music",
              icon: User,
            },
            {
              id: "contact" as const,
              labelFr: "Contact & Booking",
              labelEn: "Contact & Booking",
              icon: Phone,
            },
            {
              id: "inquiries" as const,
              labelFr: `Demandes reçues (${inquiries.length})`,
              labelEn: `Inquiries (${inquiries.length})`,
              icon: Inbox,
              badge: inquiries.length,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-3 sm:px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                  active
                    ? "border-purple-500 text-white"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-purple-400" : "text-zinc-500"}`} />
                <span>{language === "fr" ? tab.labelFr : tab.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Profil & Musique */}
      {activeTab === "profile" && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-3xl bg-[#111318] border border-white/[0.08] p-6 sm:p-8 space-y-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>{language === "fr" ? "Identité & Style musical" : "Identity & Musical Style"}</span>
            </h3>

            {/* Stage Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {language === "fr" ? "Nom de scène (Stage Name) *" : "Stage Name *"}
              </label>
              <input
                type="text"
                required
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                placeholder={tr("ex: DJ Neptune, DJ Maphorisa, DJ BDK", "e.g. DJ Neptune, DJ Maphorisa, DJ BDK")}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {language === "fr" ? "Biographie & Parcours artistique" : "Bio & Artistic Journey"}
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={
                  language === "fr"
                    ? tr("Présentez votre style, vos influences, vos résidences en club, festivals et distinctions...", "Describe your style, influences, club residencies, festivals and awards...")
                    : "Describe your style, influences, club residencies, festivals, and awards..."
                }
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none no-scrollbar"
              />
            </div>

            {/* Country & City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  {language === "fr" ? "Pays d'origine / de résidence" : "Country of Origin / Residence"}
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#181a20] border border-white/10 text-sm text-white focus:outline-none focus:border-purple-500 [color-scheme:dark] [&>option]:bg-[#181a20] [&>option]:text-white"
                >
                  <option value="">{language === "fr" ? "Sélectionner un pays" : "Select a country"}</option>
                  {AFRICAN_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {countryName(c.code, language)} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  {language === "fr" ? "Ville principale" : "Main City"}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={language === "fr" ? "ex: Lomé, Abidjan, Lagos, Paris" : "e.g. Lomé, Abidjan, Lagos, Paris"}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Genres musicaux */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300">
                  {language === "fr" ? "Genres musicaux maîtrisés (max 6)" : "Musical Genres (max 6)"}
                </label>
                <span className="text-[11px] text-zinc-500">{genres.length} / 6</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {Object.entries(GENRE_LABELS)
                  .filter(([id]) => id !== "OTHER")
                  .map(([id, label]) => {
                    const isSelected = genres.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleToggleGenre(id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          isSelected
                            ? "bg-purple-600 text-white shadow-md shadow-purple-600/25 border border-purple-500"
                            : "bg-white/[0.04] border border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                        }`}
                      >
                        {isSelected && <Check className="inline-block h-3 w-3 mr-1" />}
                        {label}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Social Links Block */}
          <div className="rounded-3xl bg-[#111318] border border-white/[0.08] p-6 sm:p-8 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="h-4 w-4 text-pink-400" />
              <span>{language === "fr" ? "Réseaux sociaux & Streaming" : "Social Links & Streaming"}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">
                  {language === "fr" ? "Site Web officiel" : "Official Website"}
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">
                  {language === "fr" ? "Instagram (@handle ou URL)" : "Instagram (@handle or URL)"}
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder={language === "fr" ? "ex: dj_khalid ou https://instagram.com/..." : "e.g. dj_khalid or https://instagram.com/..."}
                  className="w-full px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">
                  {language === "fr" ? "TikTok (@handle ou URL)" : "TikTok (@handle or URL)"}
                </label>
                <input
                  type="text"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  placeholder={language === "fr" ? "ex: @dj_khalid_live" : "e.g. @dj_khalid_live"}
                  className="w-full px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">
                  {language === "fr" ? "Twitter / X (@handle ou URL)" : "Twitter / X (@handle or URL)"}
                </label>
                <input
                  type="text"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder={language === "fr" ? "ex: @djkhalid" : "e.g. @djkhalid"}
                  className="w-full px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">
                  {language === "fr" ? "YouTube (Chaîne)" : "YouTube (Channel)"}
                </label>
                <input
                  type="text"
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  placeholder="https://youtube.com/@..."
                  className="w-full px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">
                  {language === "fr" ? "SoundCloud (Profil)" : "SoundCloud (Profile)"}
                </label>
                <input
                  type="text"
                  value={soundcloud}
                  onChange={(e) => setSoundcloud(e.target.value)}
                  placeholder="https://soundcloud.com/..."
                  className="w-full px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Submit bar */}
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 shadow-xl shadow-purple-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{language === "fr" ? "Enregistrement..." : "Saving..."}</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{language === "fr" ? "Enregistrer les modifications" : "Save Changes"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Contact & Booking Pro */}
      {activeTab === "contact" && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-3xl bg-[#111318] border border-white/[0.08] p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-400" />
                <span>
                  {language === "fr"
                    ? tr("Coordonnées de Booking & Prestations", "Booking & services contact")
                    : "Booking & Contact Information"}
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {language === "fr"
                  ? tr("Ces informations permettront aux organisateurs, clubs et fans de vous joindre directement pour des événements.", "This lets promoters, clubs and fans reach you directly for events.")
                  : "This info allows organizers, clubs, and fans to contact you directly for shows."}
              </p>
            </div>

            {/* Toggle Available for Booking */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
              <div>
                <p className="text-sm font-bold text-white">
                  {language === "fr" ? "Statut de disponibilité" : "Availability Status"}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {language === "fr"
                    ? "Affiche un badge vert 'Disponible pour bookings' sur votre profil public."
                    : "Shows a green 'Available for bookings' badge on your public profile."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAvailableForBooking(!availableForBooking)}
                className={`w-14 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out relative ${
                  availableForBooking ? "bg-emerald-500" : "bg-zinc-700"
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full bg-white transition-transform duration-200 ease-in-out shadow-md ${
                    availableForBooking ? "translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Booking Email & WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-purple-400" />
                  <span>{language === "fr" ? "Email officiel de booking" : "Official Booking Email"}</span>
                </label>
                <input
                  type="email"
                  value={bookingEmail}
                  onChange={(e) => setBookingEmail(e.target.value)}
                  placeholder={tr("booking@monnom.com", "booking@myname.com")}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
                <p className="text-[11px] text-zinc-500">
                  {language === "fr"
                    ? tr("Les demandes soumises via votre profil public seront envoyées à cette adresse.", "Requests sent from your public profile will go to this address.")
                    : "Inquiries submitted on your public profile will be sent to this email."}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-400" />
                  <span>
                    {language === "fr"
                      ? tr("Téléphone & WhatsApp pro (+ indicatif)", "Business phone & WhatsApp (with country code)")
                      : "Phone & WhatsApp (+ country code)"}
                  </span>
                </label>
                <input
                  type="tel"
                  value={bookingPhone}
                  onChange={(e) => setBookingPhone(e.target.value)}
                  placeholder="+225 07 12 34 56 78 / +33 6 12 34 56 78"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
                <p className="text-[11px] text-zinc-500">
                  {language === "fr"
                    ? "Active automatiquement le bouton WhatsApp direct en 1 clic pour les organisateurs."
                    : "Automatically enables the 1-click direct WhatsApp button for organizers."}
                </p>
              </div>
            </div>

            {/* Booking Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {language === "fr"
                  ? "Conditions de booking & Tarifs indicatifs"
                  : "Booking Conditions & Rates Overview"}
              </label>
              <textarea
                rows={3}
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder={
                  language === "fr"
                    ? tr("ex: Disponible pour clubs, mariages VIP et festivals en Afrique et Europe. Matériel requis : Pioneer CDJ-3000...", "e.g. Available for clubs, VIP weddings and festivals in Africa and Europe. Required gear: Pioneer CDJ-3000...")
                    : "e.g. Available for clubs, VIP weddings, and festivals across Africa and Europe. Rider: Pioneer CDJ-3000..."
                }
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none no-scrollbar"
              />
            </div>
          </div>

          {/* Submit bar */}
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 shadow-xl shadow-purple-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{language === "fr" ? "Enregistrement..." : "Saving..."}</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{language === "fr" ? "Enregistrer les coordonnées" : "Save Contact Info"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Demandes de booking reçues */}
      {activeTab === "inquiries" && (
        <div className="rounded-3xl bg-[#111318] border border-white/[0.08] p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Inbox className="h-4 w-4 text-purple-400" />
              <span>{language === "fr" ? "Demandes de booking reçues" : "Received Booking Inquiries"}</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              {language === "fr"
                ? tr("Retrouvez ici les messages envoyés par les organisateurs d'événements et fans via votre profil public.", "Messages from event organisers and fans sent through your public profile appear here.")
                : "Messages sent by event organizers and fans from your public profile."}
            </p>
          </div>

          {inquiriesLoading ? (
            <div className="p-8 text-center text-zinc-400">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-500" />
            </div>
          ) : inquiries.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-3">
              <MessageSquare className="h-10 w-10 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-white">
                {language === "fr" ? "Aucune demande reçue pour l'instant" : "No inquiries yet"}
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {language === "fr"
                  ? "Partagez votre profil public AfroMix pour recevoir des propositions de clubs, mariages et festivals !"
                  : "Share your public AfroMix profile to start receiving booking requests!"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {inquiries.map((inq) => {
                const dateFormatted = inq.eventDate
                  ? new Date(inq.eventDate).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : null;

                const receivedAt = new Date(inq.createdAt).toLocaleDateString(
                  language === "fr" ? "fr-FR" : "en-US",
                  { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
                );

                return (
                  <div
                    key={inq.id}
                    className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-purple-500/30 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{inq.senderName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                            {inq.eventType}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                          <a
                            href={`mailto:${inq.senderEmail}`}
                            className="hover:text-purple-400 transition-colors flex items-center gap-1"
                          >
                            <Mail className="h-3 w-3" />
                            {inq.senderEmail}
                          </a>
                          {inq.senderPhone && (
                            <a
                              href={`tel:${inq.senderPhone}`}
                              className="hover:text-emerald-400 transition-colors flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              {inq.senderPhone}
                            </a>
                          )}
                        </div>
                      </div>

                      <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {receivedAt}
                      </span>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                      {dateFormatted && (
                        <span className="inline-flex items-center gap-1 bg-white/[0.04] px-2.5 py-1 rounded-lg">
                          <Calendar className="h-3.5 w-3.5 text-purple-400" />
                          <span>{dateFormatted}</span>
                        </span>
                      )}
                      {inq.eventCity && (
                        <span className="inline-flex items-center gap-1 bg-white/[0.04] px-2.5 py-1 rounded-lg">
                          <MapPin className="h-3.5 w-3.5 text-pink-400" />
                          <span>{inq.eventCity}</span>
                        </span>
                      )}
                      {inq.budget && (
                        <span className="inline-flex items-center gap-1 bg-white/[0.04] px-2.5 py-1 rounded-lg">
                          <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{inq.budget}</span>
                        </span>
                      )}
                    </div>

                    {/* Message content */}
                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/[0.04]">
                      {inq.message}
                    </p>

                    {/* Reply buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={`mailto:${inq.senderEmail}?subject=Re:%20Votre%20demande%20de%20booking%20AfroMix`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span>{language === "fr" ? "Répondre par Email" : "Reply by Email"}</span>
                      </a>
                      {inq.senderPhone && (
                        <a
                          href={`https://wa.me/${inq.senderPhone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
