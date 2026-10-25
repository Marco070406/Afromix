"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  LogOut,
  Mail,
  Shield,
  CheckCircle,
  AlertCircle,
  User,
  Sparkles,
  Music2,
  ExternalLink,
  ChevronRight,
  Edit3,
  Save,
  X,
  MapPin,
  Globe,
  Loader2,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { countryName } from "@/app/(frontend)/lib/utils";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { RequireAuth } from "@/app/(frontend)/components/auth/require-auth";
import { Button } from "@/app/(frontend)/components/ui/button";
import { Input } from "@/app/(frontend)/components/ui/input";
import { authApi } from "@/app/(frontend)/lib/api/auth";
import { DjProfileEditor } from "@/app/(frontend)/components/profile/dj-profile-editor";

const AFRICAN_COUNTRIES = [
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "ZA", name: "Afrique du Sud" },
  { code: "SN", name: "Sénégal" },
  { code: "CM", name: "Cameroun" },
  { code: "CD", name: "RD Congo" },
  { code: "CG", name: "Congo" },
  { code: "KE", name: "Kenya" },
  { code: "TG", name: "Togo" },
  { code: "BJ", name: "Bénin" },
  { code: "ML", name: "Mali" },
  { code: "BF", name: "Burkina Faso" },
  { code: "GN", name: "Guinée" },
  { code: "GA", name: "Gabon" },
  { code: "RW", name: "Rwanda" },
  { code: "TZ", name: "Tanzanie" },
  { code: "FR", name: "France" },
  { code: "BE", name: "Belgique" },
  { code: "GB", name: "Royaume-Uni" },
  { code: "US", name: "États-Unis" },
  { code: "CA", name: "Canada" },
];

function ProfileContent() {
  const { user, logout, isArtist, isAdmin, refresh } = useAuth();
  const { language, tr } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = searchParams.get("tab") === "account" ? "account" : isArtist ? "dj" : "account";
  const [activeTab, setActiveTab] = useState<"dj" | "account">(initialTab);
  const [avatarErr, setAvatarErr] = useState(false);

  // Edit user profile state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [displayName, setDisplayName] = useState(user?.profile?.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.profile?.avatarUrl ?? "");
  const [country, setCountry] = useState(user?.profile?.country ?? "");
  const [city, setCity] = useState(user?.profile?.city ?? "");
  const [bio, setBio] = useState(user?.profile?.bio ?? "");

  // Synchronise le formulaire quand le profil serveur change (ajustement pendant le rendu)
  const [syncedProfile, setSyncedProfile] = useState(user?.profile);
  if (user?.profile !== syncedProfile) {
    setSyncedProfile(user?.profile);
    if (user?.profile) {
      setDisplayName(user.profile.displayName ?? "");
      setAvatarUrl(user.profile.avatarUrl ?? "");
      setCountry(user.profile.country ?? "");
      setCity(user.profile.city ?? "");
      setBio(user.profile.bio ?? "");
    }
  }

  const handleLogout = async () => {
    await logout();
    toast.success(language === "fr" ? "Déconnexion réussie" : "Logged out successfully");
    router.push("/");
  };

  const handleResendVerification = async () => {
    try {
      if (!user?.email) return;
      await authApi.resendVerification(user.email);
      toast.success(language === "fr" ? "Code de vérification envoyé !" : "Verification code sent!");
      router.push(`/verify-email?email=${encodeURIComponent(user.email)}`);
    } catch {
      toast.error(language === "fr" ? "Impossible d'envoyer l'email" : "Could not send email");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error(language === "fr" ? "Le nom d'affichage est requis" : "Display name is required");
      return;
    }

    setIsSaving(true);
    try {
      await authApi.updateProfile({
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim() || null,
        country: country || null,
        city: city.trim() || null,
        bio: bio.trim() || null,
      });

      await refresh();
      setIsEditing(false);
      setAvatarErr(false);
      toast.success(language === "fr" ? "Profil mis à jour avec succès !" : "Profile updated successfully!");
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : language === "fr" ? "Erreur de mise à jour" : "Update failed";
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (user?.profile) {
      setDisplayName(user.profile.displayName ?? "");
      setAvatarUrl(user.profile.avatarUrl ?? "");
      setCountry(user.profile.country ?? "");
      setCity(user.profile.city ?? "");
      setBio(user.profile.bio ?? "");
    }
  };

  const userCountry = user?.profile?.country ? countryName(user.profile.country, language) : undefined;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            {language === "fr" ? "Gestion du Profil" : "Profile Settings"}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            {language === "fr"
              ? tr("Configurez vos informations personnelles et votre vitrine DJ publique.", "Set up your personal info and your public DJ showcase.")
              : "Configure your personal information and public DJ showcase."}
          </p>
        </div>

        {/* Tab selector for artists */}
        {isArtist && (
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
            <button
              onClick={() => setActiveTab("dj")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "dj"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Music2 className="h-3.5 w-3.5" />
              <span>{language === "fr" ? "Profil DJ & Bookings" : "DJ Profile & Bookings"}</span>
            </button>

            <button
              onClick={() => setActiveTab("account")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "account"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>{language === "fr" ? "Compte AfroMix" : "AfroMix Account"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: DJ Profile Editor */}
      {isArtist && activeTab === "dj" && <DjProfileEditor />}

      {/* Tab 2: Account info */}
      {(!isArtist || activeTab === "account") && (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          {/* User card with inline editor */}
          <div className="rounded-3xl bg-[#111318] border border-white/[0.08] p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-5 justify-between">
              <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                <div className="relative h-20 w-20 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-600/20 bg-zinc-800 border-2 border-white/10">
                  {user?.profile?.avatarUrl && !avatarErr ? (
                    <Image
                      src={user.profile.avatarUrl}
                      alt={user.profile.displayName ?? "Avatar"}
                      fill
                      className="object-cover"
                      sizes="80px"
                      onError={() => setAvatarErr(true)}
                    />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-3xl font-black text-white bg-gradient-to-br from-purple-600 to-pink-600 select-none">
                      {user?.profile?.displayName?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  )}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <p className="text-xl font-bold text-white">{user?.profile?.displayName || "Utilisateur AfroMix"}</p>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-zinc-400">
                    <Mail className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="text-sm truncate">{user?.email}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1.5">
                    <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                      {user?.role === "ARTIST"
                        ? tr("DJ / Artiste Créateur", "DJ / Creator")
                        : user?.role === "ADMIN"
                        ? tr("Administrateur", "Administrator")
                        : tr("Auditeur", "Listener")}
                    </span>
                    {user?.emailVerified ? (
                      <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle className="h-3 w-3" />
                        {language === "fr" ? "Vérifié" : "Verified"}
                      </div>
                    ) : (
                      <button
                        onClick={handleResendVerification}
                        className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        <AlertCircle className="h-3 w-3" />
                        {language === "fr" ? "Non vérifié (renvoyer)" : "Unverified (resend)"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {!isEditing && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 self-center sm:self-start mt-2 sm:mt-0"
                >
                  <Edit3 className="h-3.5 w-3.5 text-purple-400" />
                  <span>{language === "fr" ? "Modifier mes infos" : "Edit Info"}</span>
                </Button>
              )}
            </div>

            {/* Read-only Bio and Location if present */}
            {!isEditing && (user?.profile?.bio || user?.profile?.country || user?.profile?.city) && (
              <div className="pt-4 border-t border-white/[0.06] space-y-3">
                {user.profile.bio && (
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed italic">
                    &ldquo;{user.profile.bio}&rdquo;
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                  {(user.profile.city || userCountry) && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <MapPin className="h-3 w-3 text-purple-400" />
                      {[user.profile.city, userCountry].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {user.profile.website && (
                    <a
                      href={user.profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-purple-400 hover:text-purple-300"
                    >
                      <Globe className="h-3 w-3" />
                      <span>{user.profile.website.replace(/^https?:\/\//, "")}</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Profile Edit Form */}
            {isEditing && (
              <form onSubmit={handleSaveProfile} className="pt-5 border-t border-white/[0.08] space-y-4 animate-fade-in">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-purple-400" />
                  <span>{language === "fr" ? "Mettre à jour mes informations" : "Update Personal Information"}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={language === "fr" ? "Nom public / Pseudo" : "Display Name"}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={tr("Ex: Kwame, DJ Diallo, Amara", "E.g. Kwame, DJ Diallo, Amara")}
                    required
                  />

                  <Input
                    label={language === "fr" ? "Photo de profil (URL)" : "Avatar Image URL"}
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    leftIcon={<Camera className="h-4 w-4" />}
                  />

                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-sm font-semibold text-zinc-300">
                      {language === "fr" ? "Pays" : "Country"}
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#181a20] border border-white/10 text-sm text-white px-3 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    >
                      <option value="">{language === "fr" ? "Sélectionner un pays" : "Select a country"}</option>
                      {AFRICAN_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {countryName(c.code, language)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label={language === "fr" ? "Ville" : "City"}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={tr("Ex: Abidjan, Lagos, Dakar, Paris...", "E.g. Abidjan, Lagos, Dakar, Paris...")}
                    leftIcon={<MapPin className="h-4 w-4" />}
                  />
                </div>

                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-sm font-semibold text-zinc-300">
                    {language === "fr" ? "Biographie / À propos" : "Bio / About"}
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={
                      language === "fr"
                        ? tr("Passionné d'Amapiano et d'Afrobeats, résident à Abidjan...", "Amapiano and Afrobeats lover, based in Abidjan...")
                        : "Passionate about Afrobeats and Amapiano..."
                    }
                    className="w-full rounded-xl bg-[#181a20] border border-white/10 text-sm text-white p-3 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none placeholder:text-zinc-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4" />
                    <span>{language === "fr" ? "Annuler" : "Cancel"}</span>
                  </Button>

                  <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    disabled={isSaving}
                    className="flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{language === "fr" ? "Enregistrement..." : "Saving..."}</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>{language === "fr" ? "Enregistrer" : "Save Changes"}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* CTA Devenir DJ (Visible pour les auditeurs) */}
          {!isArtist && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950/40 via-[#12131b] to-pink-950/30 border border-purple-500/25 p-6 sm:p-7 shadow-xl shadow-purple-950/20 group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="space-y-2 max-w-md">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{language === "fr" ? "Espace Créateur" : "Creator Hub"}</span>
                  </div>
                  <h2 className="text-lg font-bold text-white leading-snug">
                    {language === "fr"
                      ? tr("Vous êtes DJ ? Partagez vos sets sur AfroMix", "Are you a DJ? Share your sets on AfroMix")
                      : "Are you a DJ? Share your mixes on AfroMix"}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    {language === "fr"
                      ? tr("Publiez vos mixes exclusifs, analysez vos écoutes, gérez vos liens de booking et faites vibrer la communauté AfroMix.", "Publish exclusive mixes, track your plays, manage your booking links and move the AfroMix community.")
                      : "Publish exclusive mixes, analyze listenership, manage booking requests, and grow your audience."}
                  </p>
                </div>

                <Link
                  href="/register?role=artist"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 transition-all shadow-lg shadow-purple-600/25 whitespace-nowrap self-start sm:self-center flex-shrink-0"
                >
                  <span>{language === "fr" ? "Activer mon profil DJ" : "Activate DJ Profile"}</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="grid gap-3">
            {isArtist && (
              <Link
                href="/dashboard"
                className="flex items-center gap-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5 hover:bg-white/[0.06] hover:border-purple-500/30 transition-all group"
              >
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                    {language === "fr" ? "Dashboard Studio DJ" : "DJ Studio Dashboard"}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {language === "fr"
                      ? tr("Analytics, écoutes et gestion de vos mixes", "Analytics, plays and mix management")
                      : "Analytics, plays, and mix management"}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300" />
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5 hover:bg-white/[0.06] hover:border-red-500/30 transition-all group"
              >
                <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white group-hover:text-red-300 transition-colors">
                    {language === "fr" ? "Panneau d'administration" : "Admin Panel"}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {language === "fr"
                      ? tr("Gestion et modération de la plateforme", "Platform management and moderation")
                      : "Platform moderation and control"}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300" />
              </Link>
            )}
          </div>

          {/* Logout */}
          <div className="pt-6 border-t border-white/[0.08] flex justify-end">
            <Button variant="danger" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              <span>{language === "fr" ? "Se déconnecter" : "Log out"}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-pulse">
            <div className="h-10 w-64 bg-white/5 rounded-2xl" />
            <div className="h-40 bg-[#111318] rounded-3xl border border-white/[0.08]" />
          </div>
        }
      >
        <ProfileContent />
      </Suspense>
    </RequireAuth>
  );
}
