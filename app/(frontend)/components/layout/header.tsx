"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Compass,
  Library,
  LogOut,
  TrendingUp,
  Users,
  Menu,
  Mic2,
  Settings,
  Star,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/app/(frontend)/lib/api/notifications";
import { AfromixLogo } from "@/app/(frontend)/components/brand/afromix-logo";
import { SearchBar } from "@/app/(frontend)/components/layout/search-bar";
import { NotificationBellPopover } from "@/app/(frontend)/components/notifications/notification-bell-popover";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { cn } from "@/app/(frontend)/lib/utils";

// ---------------------------------------------------------------------------
// Small reusable sub-component: renders either the real avatar or the initial
// fallback. Kept here to avoid prop-drilling the error state down.
// ---------------------------------------------------------------------------
function AvatarImage({
  avatarUrl,
  displayName,
  size = 36,
  className = "",
}: {
  avatarUrl: string | null | undefined;
  displayName: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const [imgErr, setImgErr] = useState(false);
  const initial = displayName?.[0]?.toUpperCase() ?? "?";

  if (avatarUrl && !imgErr) {
    return (
      <Image
        src={avatarUrl}
        alt={displayName ?? "Avatar"}
        width={size}
        height={size}
        className={cn("object-cover w-full h-full", className)}
        onError={() => setImgErr(true)}
      />
    );
  }

  return (
    <span className="w-full h-full flex items-center justify-center text-sm font-bold text-white bg-surface-3 select-none">
      {initial}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Shared className for dropdown menu items
// ---------------------------------------------------------------------------
const menuItemCls =
  "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer outline-none data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-white";

// ---------------------------------------------------------------------------
// Main Header component
// ---------------------------------------------------------------------------
export function Header() {
  const router = useRouter();
  const { user, isArtist, logout } = useAuth();
  const { t, language, setLanguage, tr } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: unreadData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationsApi.unreadCount(),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const unreadCount = unreadData?.data?.count ?? 0;

  // Ferme le menu mobile à chaque changement de page (l'ancien effet à [] ne se
  // déclenchait qu'au montage)
  const pathname = usePathname();
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (pathname !== menuPathname) {
    setMenuPathname(pathname);
    setMobileMenuOpen(false);
  }

  return (
    <div className="sticky top-0 z-40">
      <header className="flex h-16 items-center gap-4 border-b border-line bg-bg/80 backdrop-blur-xl px-4 lg:px-6">
        {/* Mobile logo */}
        <Link href="/" className="flex lg:hidden items-center flex-shrink-0" aria-label={tr("AfroMix — Accueil", "AfroMix — Home")}>
          <AfromixLogo height={30} />
        </Link>

        {/* Nav arrows (desktop) */}
        <div className="hidden lg:flex items-center gap-1">
          <button
            onClick={() => router.back()}
            className="h-8 w-8 rounded-full bg-surface-2 flex items-center justify-center text-muted hover:text-white hover:bg-surface-3 transition-colors"
            aria-label={tr("Retour", "Back")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => router.forward()}
            className="h-8 w-8 rounded-full bg-surface-2 flex items-center justify-center text-muted hover:text-white hover:bg-surface-3 transition-colors"
            aria-label={tr("Suivant", "Forward")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Live Search */}
        <div className="flex-1 max-w-md">
          <SearchBar />
        </div>

        {/* Le sélecteur de langue vit dans la sidebar (desktop) et le menu mobile */}
        <div className="ml-auto flex items-center gap-3">
          {/* Notifications Popover */}
          {user && <NotificationBellPopover />}

          {/* Avatar dropdown (desktop) or auth buttons */}
          {user ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="h-9 w-9 rounded-full overflow-hidden flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                  aria-label={tr("Menu utilisateur", "User menu")}
                >
                  <AvatarImage
                    avatarUrl={user.profile?.avatarUrl}
                    displayName={user.profile?.displayName}
                    size={36}
                  />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 min-w-[220px] rounded-2xl bg-surface-2 border border-line-strong shadow-2xl p-1.5 animate-slide-down"
                >
                  {/* User info header */}
                  <div className="px-3 py-2.5 border-b border-white/[0.06] mb-1">
                    <p className="text-sm font-semibold text-white truncate">
                      {user.profile?.displayName ?? user.email}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                  </div>

                  {/* Mon Profil */}
                  <DropdownMenu.Item asChild>
                    <Link href="/profile" className={menuItemCls}>
                      <User className="h-4 w-4 flex-shrink-0" />
                      {tr("Mon Profil", "My profile")}
                    </Link>
                  </DropdownMenu.Item>

                  {/* Favoris & Playlists */}
                  <DropdownMenu.Item asChild>
                    <Link href="/library" className={menuItemCls}>
                      <Library className="h-4 w-4 flex-shrink-0" />
                      {tr("Favoris & Playlists", "Favourites & Playlists")}
                    </Link>
                  </DropdownMenu.Item>

                  {/* Paramètres */}
                  <DropdownMenu.Item asChild>
                    <Link href="/settings" className={menuItemCls}>
                      <Settings className="h-4 w-4 flex-shrink-0" />
                      {tr("Paramètres", "Settings")}
                    </Link>
                  </DropdownMenu.Item>

                  {/* Espace Studio (ARTIST) or Devenir DJ (USER) */}
                  {isArtist ? (
                    <DropdownMenu.Item asChild>
                      <Link href="/dashboard" className={menuItemCls}>
                        <Mic2 className="h-4 w-4 flex-shrink-0" />
                        {tr("Espace Studio", "Studio")}
                      </Link>
                    </DropdownMenu.Item>
                  ) : (
                    <DropdownMenu.Item asChild>
                      <Link
                        href="/register?role=artist"
                        className={cn(menuItemCls, "text-purple-400 hover:text-purple-300")}
                      >
                        <Star className="h-4 w-4 flex-shrink-0" />
                        {tr("Devenir DJ", "Become a DJ")}
                      </Link>
                    </DropdownMenu.Item>
                  )}

                  <DropdownMenu.Separator className="my-1 h-px bg-white/[0.06]" />

                  {/* Déconnexion */}
                  <DropdownMenu.Item
                    className={cn(menuItemCls, "text-red-400 hover:text-red-300")}
                    onSelect={() => logout()}
                  >
                    <LogOut className="h-4 w-4 flex-shrink-0" />
                    {tr("Déconnexion", "Log out")}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/login"
                className="h-9 px-4 flex items-center justify-center text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-full transition-colors whitespace-nowrap"
              >
                {t("btn.login")}
              </Link>
              <Link
                href="/register"
                className="h-9 px-5 flex items-center justify-center text-xs font-bold text-white rounded-full bg-brand-gradient shadow-md shadow-brand/20 whitespace-nowrap"
              >
                {t("btn.register")}
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden h-9 w-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? tr("Fermer le menu", "Close menu") : tr("Ouvrir le menu", "Open menu")}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Menu panel */}
          <div className="lg:hidden fixed top-16 left-0 right-0 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain bg-surface border-b border-line px-4 py-4 flex flex-col gap-3 animate-fade-in-up">
            {/* Découverte : ces pages n'ont pas d'onglet dans la barre du bas sur mobile */}
            <nav aria-label={t("nav.discover")} className="grid grid-cols-2 gap-2">
              {[
                { href: "/explore", icon: Compass, label: t("nav.explore") },
                { href: "/trending", icon: TrendingUp, label: t("nav.trending") },
                { href: "/artists", icon: Users, label: t("nav.djs") },
                { href: "/events", icon: Calendar, label: t("nav.events") },
              ].map(({ href, icon: Icon, label }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-3 rounded-xl border text-sm font-medium transition-colors",
                      active
                        ? "bg-white/[0.07] border-line-strong text-white"
                        : "bg-surface-2 border-line text-muted hover:text-white hover:border-line-strong"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-brand" : "text-subtle")} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="h-px bg-line" />

            {user ? (
              <>
                {/* Profile row with real avatar */}
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors"
                >
                  <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
                    <AvatarImage
                      avatarUrl={user.profile?.avatarUrl}
                      displayName={user.profile?.displayName}
                      size={32}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.profile?.displayName ?? user.email}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                  </div>
                </Link>

                {/* Library */}
                <Link
                  href="/library"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 text-sm text-zinc-400 hover:text-white px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors"
                >
                  <Library className="h-4 w-4 flex-shrink-0" />
                  {t("nav.library")}
                </Link>

                {/* Notifications */}
                <Link
                  href="/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between text-sm text-zinc-400 hover:text-white px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Bell className="h-4 w-4 flex-shrink-0" />
                    {t("nav.notifications")}
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                {/* Settings */}
                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 text-sm text-zinc-400 hover:text-white px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors"
                >
                  <Settings className="h-4 w-4 flex-shrink-0" />
                  {tr("Paramètres", "Settings")}
                </Link>

                {/* Espace Studio (ARTIST) or Devenir DJ (USER) */}
                {isArtist ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 text-sm text-zinc-400 hover:text-white px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors"
                  >
                    <Mic2 className="h-4 w-4 flex-shrink-0" />
                    {tr("Espace Studio", "Studio")}
                  </Link>
                ) : (
                  <Link
                    href="/register?role=artist"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 text-sm text-purple-400 hover:text-purple-300 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors"
                  >
                    <Star className="h-4 w-4 flex-shrink-0" />
                    {tr("Devenir DJ", "Become a DJ")}
                  </Link>
                )}

                {/* Separator */}
                <div className="h-px bg-white/[0.06] mx-3" />

                {/* Logout */}
                <button
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await logout();
                  }}
                  className="flex items-center gap-2.5 text-sm text-red-400 hover:text-red-300 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors w-full text-left"
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  {tr("Déconnexion", "Log out")}
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm text-center text-zinc-300 hover:text-white px-4 py-2.5 rounded-xl border border-white/[0.08] hover:border-white/[0.16] transition-colors"
                >
                  {t("btn.login")}
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm text-center font-medium text-white px-4 py-2.5 rounded-xl bg-brand-gradient"
                >
                  {t("btn.register")}
                </Link>
              </div>
            )}

            {/* Mobile language switcher */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.06] mt-1 pt-3">
              <span className="text-xs text-zinc-400 font-medium">Langue / Language</span>
              <div className="flex items-center p-0.5 rounded-full bg-white/[0.06] border border-white/10">
                <button
                  type="button"
                  onClick={() => setLanguage("fr")}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-bold transition-all",
                    language === "fr"
                      ? "bg-surface-3 text-white"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  FR
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-bold transition-all",
                    language === "en"
                      ? "bg-surface-3 text-white"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
