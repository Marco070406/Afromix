"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Plus, Library, User, ListMusic } from "lucide-react";
import { cn } from "@/app/(frontend)/lib/utils";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

export function BottomNav() {
  const pathname = usePathname();
  const { user, isArtist } = useAuth();
  const { t } = useI18n();

  const isHomeActive = pathname === "/";
  const isExploreActive = pathname.startsWith("/explore");
  const isPlaylistsActive = pathname.startsWith("/playlists");
  const isUploadActive = pathname.startsWith("/upload");
  const isLibraryActive = pathname.startsWith("/library");
  const isProfileActive = pathname.startsWith("/profile");

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg/95 backdrop-blur-2xl border-t border-line pb-safe">
      <div className="flex items-center justify-around h-15 px-2">
        {/* Accueil */}
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center gap-1 flex-1 py-1.5 transition-colors relative",
            isHomeActive ? "text-white font-semibold" : "text-subtle hover:text-zinc-300"
          )}
        >
          <Home className="h-5 w-5" strokeWidth={isHomeActive ? 2.5 : 1.75} />
          <span className="text-[10px]">{t("nav.home")}</span>
          {isHomeActive && (
            <span className="absolute bottom-0 h-0.5 w-4 rounded-full bg-brand" />
          )}
        </Link>

        {/* Explorer */}
        <Link
          href="/explore"
          className={cn(
            "flex flex-col items-center gap-1 flex-1 py-1.5 transition-colors relative",
            isExploreActive ? "text-white font-semibold" : "text-subtle hover:text-zinc-300"
          )}
        >
          <Compass className="h-5 w-5" strokeWidth={isExploreActive ? 2.5 : 1.75} />
          <span className="text-[10px]">{t("nav.explore")}</span>
          {isExploreActive && (
            <span className="absolute bottom-0 h-0.5 w-4 rounded-full bg-brand" />
          )}
        </Link>

        {/* Bouton central surélevé : Upload (Artistes) ou Playlists (Auditeurs) */}
        <div className="flex flex-col items-center flex-1 -mt-4">
          {isArtist ? (
            <Link
              href="/upload"
              className={cn(
                "h-12 w-12 rounded-full bg-brand-gradient flex items-center justify-center text-white shadow-lg shadow-brand/30 hover:scale-105 active:scale-95 transition-all",
                isUploadActive && "ring-2 ring-white ring-offset-2 ring-offset-bg scale-105"
              )}
              aria-label={t("nav.upload")}
            >
              <Plus className="h-6 w-6 stroke-[2.5]" />
            </Link>
          ) : (
            <Link
              href={user ? "/playlists" : "/login"}
              className={cn(
                "h-12 w-12 rounded-full bg-brand-gradient flex items-center justify-center text-white shadow-lg shadow-brand/30 hover:scale-105 active:scale-95 transition-all",
                isPlaylistsActive && "ring-2 ring-white ring-offset-2 ring-offset-bg scale-105"
              )}
              aria-label={t("nav.playlists")}
            >
              <ListMusic className="h-6 w-6 stroke-[2.2]" />
            </Link>
          )}
          <span
            className={cn(
              "text-[10px] font-semibold mt-1",
              (isArtist ? isUploadActive : isPlaylistsActive) ? "text-white" : "text-subtle"
            )}
          >
            {isArtist ? t("nav.upload") : t("nav.playlists")}
          </span>
        </div>

        {/* Bibliothèque */}
        <Link
          href={user ? "/library" : "/login"}
          className={cn(
            "flex flex-col items-center gap-1 flex-1 py-1.5 transition-colors relative",
            isLibraryActive ? "text-white font-semibold" : "text-subtle hover:text-zinc-300"
          )}
        >
          <Library className="h-5 w-5" strokeWidth={isLibraryActive ? 2.5 : 1.75} />
          <span className="text-[10px]">{t("nav.library")}</span>
          {isLibraryActive && (
            <span className="absolute bottom-0 h-0.5 w-4 rounded-full bg-brand" />
          )}
        </Link>

        {/* Profil */}
        <Link
          href={user ? "/profile" : "/login"}
          className={cn(
            "flex flex-col items-center gap-1 flex-1 py-1.5 transition-colors relative",
            isProfileActive ? "text-white font-semibold" : "text-subtle hover:text-zinc-300"
          )}
        >
          <User className="h-5 w-5" strokeWidth={isProfileActive ? 2.5 : 1.75} />
          <span className="text-[10px]">{t("nav.profile")}</span>
          {isProfileActive && (
            <span className="absolute bottom-0 h-0.5 w-4 rounded-full bg-brand" />
          )}
        </Link>
      </div>
    </nav>
  );
}
