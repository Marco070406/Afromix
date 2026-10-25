"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Compass, TrendingUp, Users, ListMusic,
  Calendar, Library, BarChart3, Upload, Shield,
  Settings, ChevronLeft, ChevronRight, Sparkles, User,
} from "lucide-react";
import { useStoredValue } from "@/app/(frontend)/hooks/use-stored-value";
import { AfromixLogo, AfromixSymbol } from "@/app/(frontend)/components/brand/afromix-logo";
import { cn } from "@/app/(frontend)/lib/utils";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { useI18n, type TranslationKey } from "@/app/(frontend)/providers/i18n-provider";

export function Sidebar() {
  const pathname = usePathname();
  const { user, isArtist, isAdmin } = useAuth();
  const { language, setLanguage, t, tr } = useI18n();
  const [collapsedRaw, setCollapsedRaw] = useStoredValue("afromix_sidebar_collapsed", "false");
  const isCollapsed = collapsedRaw === "true";

  const toggleCollapsed = () => setCollapsedRaw(String(!isCollapsed));

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Sections bien structurées
  const discoverNav: Array<{ href: string; icon: React.ElementType; key: TranslationKey }> = [
    { href: "/", icon: Home, key: "nav.home" },
    { href: "/explore", icon: Compass, key: "nav.explore" },
    { href: "/trending", icon: TrendingUp, key: "nav.trending" },
    { href: "/artists", icon: Users, key: "nav.djs" },
    { href: "/events", icon: Calendar, key: "nav.events" },
  ];

  const libraryNav: Array<{ href: string; icon: React.ElementType; key: TranslationKey }> = [
    { href: "/playlists", icon: ListMusic, key: "nav.playlists" },
    { href: "/library", icon: Library, key: "nav.library" },
  ];

  const creatorNav: Array<{ href: string; icon: React.ElementType; key: TranslationKey }> = [
    { href: "/dashboard", icon: BarChart3, key: "nav.studio" },
    { href: "/dashboard/profile", icon: User, key: "nav.djProfile" },
    { href: "/upload", icon: Upload, key: "nav.upload" },
    { href: "/analytics", icon: Sparkles, key: "nav.analytics" },
  ];

  const adminNav: Array<{ href: string; icon: React.ElementType; key: TranslationKey }> = [
    { href: "/admin", icon: Shield, key: "nav.admin" as TranslationKey },
  ];

  const renderNavLink = (item: { href: string; icon: React.ElementType; key: TranslationKey }) => {
    // "/dashboard" ne doit pas rester actif sur "/dashboard/profile"
    const active = item.href === "/dashboard" ? pathname === "/dashboard" : isActive(item.href);
    const Icon = item.icon;
    const label = t(item.key);

    return (
      <Link
        key={item.href}
        href={item.href}
        title={isCollapsed ? label : undefined}
        className={cn(
          "relative flex items-center rounded-xl text-sm transition-colors duration-200 group",
          isCollapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3 h-10",
          active
            ? "bg-white/[0.07] text-white font-semibold"
            : "text-muted font-medium hover:text-white hover:bg-white/[0.04]"
        )}
      >
        {/* Active Indicator bar */}
        {active && !isCollapsed && (
          <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-brand" />
        )}

        <Icon
          className={cn(
            "h-[18px] w-[18px] flex-shrink-0 transition-colors",
            active ? "text-brand" : "text-subtle group-hover:text-zinc-300"
          )}
        />

        {!isCollapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  const renderSection = (
    label: string,
    items: Array<{ href: string; icon: React.ElementType; key: TranslationKey }>,
    labelClassName = "text-subtle"
  ) => (
    <div>
      {!isCollapsed && (
        <p className={cn("px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em]", labelClassName)}>
          {label}
        </p>
      )}
      <nav className="flex flex-col gap-0.5 w-full">{items.map(renderNavLink)}</nav>
    </div>
  );

  const langBtn = (code: "fr" | "en") => (
    <button
      onClick={() => setLanguage(code)}
      className={cn(
        "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors",
        language === code ? "bg-surface-3 text-white" : "text-subtle hover:text-white"
      )}
    >
      {code.toUpperCase()}
    </button>
  );

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col flex-shrink-0 h-full bg-bg border-r border-line pt-5 pb-28 transition-all duration-300 select-none overflow-y-auto no-scrollbar",
        isCollapsed ? "w-20 px-2" : "w-64 px-4"
      )}
    >
      {/* ── Logo AfroMix + Collapse Toggle ── */}
      <div className={cn("flex items-center mb-7", isCollapsed ? "justify-center" : "justify-between px-1")}>
        <Link href="/" className="flex items-center" aria-label={tr("AfroMix — Accueil", "AfroMix — Home")}>
          {isCollapsed ? <AfromixSymbol size={36} /> : <AfromixLogo height={34} />}
        </Link>

        {!isCollapsed && (
          <button
            onClick={toggleCollapsed}
            className="h-8 w-8 rounded-lg text-subtle hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors"
            title={t("nav.collapseMenu")}
            aria-label={t("nav.collapseMenu")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {isCollapsed && (
        <button
          onClick={toggleCollapsed}
          className="mb-5 h-8 w-8 mx-auto rounded-lg text-subtle hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors"
          title={t("nav.expandMenu")}
          aria-label={t("nav.expandMenu")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* ── Navigation Items ── */}
      <div className="flex flex-col gap-7 w-full">
        {renderSection(t("nav.discover"), discoverNav)}
        {renderSection(t("nav.myMusic"), libraryNav)}
        {/* Espace Créateur (affiché uniquement pour les DJs / Artistes connectés) */}
        {isArtist && renderSection(t("nav.creator"), creatorNav)}
        {/* Administration (affiché uniquement pour les admins) */}
        {isAdmin && renderSection(t("nav.admin" as TranslationKey), adminNav, "text-red-400/70")}
      </div>

      {/* ── Pied de page (Footer) ── */}
      <div className="mt-auto pt-5 border-t border-line w-full space-y-3">
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center p-0.5 rounded-lg bg-surface border border-line">
              {langBtn("fr")}
              {langBtn("en")}
            </div>

            <Link
              href="/settings"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-subtle hover:text-white hover:bg-white/[0.06] transition-colors"
              title={t("nav.settings")}
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <button
            onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
            className="h-10 w-10 mx-auto rounded-xl bg-surface hover:bg-surface-2 border border-line flex items-center justify-center text-xs font-bold text-muted hover:text-white transition-colors"
            title={tr("Changer de langue", "Change language")}
          >
            {language.toUpperCase()}
          </button>
        )}

        {/* Profil connecté OU Boutons Connexion / Inscription */}
        {user ? (
          <Link
            href="/profile"
            className={cn(
              "flex items-center rounded-xl hover:bg-white/[0.05] transition-colors group",
              isCollapsed ? "justify-center p-1.5" : "gap-3 p-2"
            )}
            title={isCollapsed ? user.profile?.displayName ?? user.email : undefined}
          >
            <div className="h-9 w-9 rounded-full bg-surface-3 border border-line-strong flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {user.profile?.displayName?.[0]?.toUpperCase() ?? "U"}
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">
                  {user.profile?.displayName ?? user.email.split("@")[0]}
                </p>
                <p className="text-xs text-subtle">
                  {isAdmin ? t("nav.adminRole" as TranslationKey) : isArtist ? t("nav.artist") : t("nav.listener")}
                </p>
              </div>
            )}
          </Link>
        ) : (
          !isCollapsed && (
            <div className="flex flex-col gap-2">
              <Link
                href="/register"
                className="w-full h-10 flex items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white shadow-lg shadow-brand/20"
              >
                {t("btn.register")}
              </Link>
              <Link
                href="/login"
                className="w-full h-10 flex items-center justify-center rounded-full border border-line-strong hover:bg-white/[0.06] text-sm font-semibold text-white transition-colors"
              >
                {t("btn.login")}
              </Link>
            </div>
          )
        )}
      </div>
    </aside>
  );
}
