"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Play,
  TrendingUp,
  Sparkles,
  Globe,
  Music,
  ArrowRight,
  User,
  Drum,
  Piano,
  Speaker,
  Heart,
  Palmtree,
  Flame,
  AudioLines,
  Zap,
  Activity,
  Guitar,
  PartyPopper,
  Music2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { discoveryApi } from "@/app/(frontend)/lib/api/discovery";
import { MixCard } from "@/app/(frontend)/components/cards/mix-card";
import { ArtistCard } from "@/app/(frontend)/components/cards/artist-card";
import { TopMonthlyDjs } from "./top-monthly-djs";
import { MixCardSkeleton, ArtistCardSkeleton } from "@/app/(frontend)/components/ui/skeleton";
import { ErrorState } from "@/app/(frontend)/components/ui/error-state";
import { Button } from "@/app/(frontend)/components/ui/button";
import { usePlayer } from "@/app/(frontend)/providers/player-provider";
import { useI18n, type TranslationKey } from "@/app/(frontend)/providers/i18n-provider";
import { formatCount, formatDuration, genreLabel } from "@/app/(frontend)/lib/utils";
import type { PlayerTrack } from "@/app/(frontend)/providers/player-provider";

// Icônes thématiques Lucide React par genre
const GENRE_ICONS: Record<string, LucideIcon> = {
  AFROBEATS: Drum,
  AMAPIANO: Piano,
  AFRO_HOUSE: Speaker,
  AFRO_SOUL: Heart,
  BONGO_FLAVA: Palmtree,
  DANCEHALL: Flame,
  HIGHLIFE: AudioLines,
  KIZOMBA: Sparkles,
  KUDURO: Zap,
  NDOMBOLO: Activity,
  RUMBA: Guitar,
  SOCA: PartyPopper,
  OTHER: Music2,
};

// Pays africains représentés
const AFRICAN_COUNTRIES = [
  { code: "TG", name: "Togo", count: 12 },
  { code: "GH", name: "Ghana", count: 28 },
  { code: "NG", name: "Nigeria", count: 54 },
  { code: "CI", name: "Côte d'Ivoire", count: 31 },
  { code: "SN", name: "Sénégal", count: 19 },
  { code: "CM", name: "Cameroun", count: 22 },
  { code: "ZA", name: "Afrique du Sud", count: 47 },
  { code: "KE", name: "Kenya", count: 16 },
];

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: "easeOut" } },
};

// Teintes d'accent des tuiles genre : une famille restreinte, cohérente avec la marque
const GENRE_ACCENTS = ["#A855F7", "#EC4899", "#F5B83D", "#34D399"];

function SectionHeader({ icon: Icon, title, href, viewAllText = "Voir tout" }: { icon: React.ElementType; title: string; href?: string; viewAllText?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="h-[18px] w-[18px] text-brand flex-shrink-0" />
        <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="text-xs sm:text-sm font-medium text-muted hover:text-white transition-colors flex items-center gap-1 group flex-shrink-0">
          <span>{viewAllText}</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

export function HomepageClient() {
  const { play } = usePlayer();
  const { t, language } = useI18n();

  const { data: trendingData, isLoading: trendingLoading, error: trendingError, refetch: refetchTrending } = useQuery({
    queryKey: ["trending", "home"],
    queryFn: () => discoveryApi.trending({ period: "7d", type: "mixes", limit: 10 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: artistsData, isLoading: artistsLoading } = useQuery({
    queryKey: ["artists", "popular"],
    queryFn: () => discoveryApi.popular({ type: "artists", limit: 8 }),
    staleTime: 10 * 60 * 1000,
  });

  const { data: newData, isLoading: newLoading } = useQuery({
    queryKey: ["new-releases", "home"],
    queryFn: () => discoveryApi.newReleases({ days: 30, type: "mixes", limit: 6 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: genresData } = useQuery({
    queryKey: ["genres"],
    queryFn: () => discoveryApi.genres(),
    staleTime: 30 * 60 * 1000,
  });

  const { data: monthlyDjsData, isLoading: monthlyDjsLoading } = useQuery({
    queryKey: ["trending-djs-monthly"],
    queryFn: () => discoveryApi.trending({ type: "artists", period: "30d", limit: 5 }),
    staleTime: 5 * 60 * 1000,
  });

  const heroMix = trendingData?.data?.mixes?.[0];
  const trendingMixes = trendingData?.data?.mixes?.slice(1, 7) ?? [];
  const topMonthlyDjs = monthlyDjsData?.data?.artists ?? [];
  const popularArtists = artistsData?.data?.artists ?? [];
  const newMixes = newData?.data?.mixes ?? [];
  const genres = (genresData?.data ?? []).filter((g) => g.total > 0).slice(0, 8);

  const handleHeroPlay = () => {
    if (!heroMix?.audioUrl) return;
    const pt: PlayerTrack = {
      id: heroMix.id, slug: heroMix.slug, title: heroMix.title,
      audioUrl: heroMix.audioUrl, coverUrl: heroMix.coverUrl,
      durationSec: heroMix.durationSec, artist: heroMix.artist, type: "mix",
    };
    const queue = (trendingData?.data?.mixes ?? [])
      .filter((m) => m.audioUrl)
      .map((m): PlayerTrack => ({
        id: m.id, slug: m.slug, title: m.title, audioUrl: m.audioUrl!,
        coverUrl: m.coverUrl, durationSec: m.durationSec, artist: m.artist, type: "mix",
      }));
    play(pt, queue.length > 0 ? queue : [pt]);
  };

  return (
    <motion.div
      className="px-4 lg:px-8 py-6 space-y-14 max-w-7xl mx-auto"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* ── Immersive Hero ── */}
      <motion.div variants={itemVariants}>
        {trendingLoading ? (
          <div className="h-80 sm:h-96 rounded-3xl animate-pulse bg-surface" />
        ) : trendingError ? (
          <ErrorState message={t("hero.error")} onRetry={() => refetchTrending()} />
        ) : heroMix ? (
          <div className="relative rounded-3xl overflow-hidden min-h-[340px] sm:min-h-[420px] bg-surface group border border-line flex items-end">
            {/* Background Cover Image */}
            <div className="absolute inset-0">
              <Image
                src={heroMix.coverUrl || "/images/hero.jpg"}
                alt={heroMix.title}
                fill
                className="object-cover group-hover:scale-[1.03] transition-transform duration-1000"
                sizes="100vw"
                priority
              />
              {/* Vignette : lisibilité du texte en bas à gauche */}
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/60 to-transparent" />
            </div>

            {/* Hero Content */}
            <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-4">
              <div className="flex items-center gap-2 flex-wrap text-xs font-medium">
                <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.12em] text-[11px] text-brand">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("badge.newMix")}
                </span>
                <span className="text-subtle">•</span>
                <span className="text-zinc-300">{genreLabel(heroMix.genre, language)}</span>
                {heroMix.artist.country && (
                  <>
                    <span className="text-subtle">•</span>
                    <span className="text-zinc-300">{heroMix.artist.country}</span>
                  </>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white line-clamp-2 leading-[1.05]">
                {heroMix.title}
              </h1>

              <p className="text-sm sm:text-base text-zinc-300 line-clamp-2 leading-relaxed max-w-xl">
                <Link href={`/artists/${heroMix.artist.slug}`} className="font-semibold text-white hover:underline underline-offset-4">
                  {heroMix.artist.stageName}
                </Link>{" "}
                {t("hero.subtitle")}
              </p>

              {/* Action Buttons */}
              <div className="pt-1 flex items-center gap-3 flex-wrap">
                <Button onClick={handleHeroPlay} size="lg" className="gap-2.5 px-7">
                  <Play className="h-5 w-5 fill-current" />
                  {t("btn.listenNow")}
                </Button>

                <Link href={`/artists/${heroMix.artist.slug}`}>
                  <Button variant="outline" size="lg" className="gap-2 bg-black/30 backdrop-blur-md">
                    <User className="h-4 w-4" />
                    {t("btn.viewProfile")}
                  </Button>
                </Link>

                <span className="text-xs text-muted sm:ml-2 font-medium tabular-nums">
                  {formatCount(heroMix.playCount)} {t("common.plays")}
                  {heroMix.durationSec && ` • ${formatDuration(heroMix.durationSec)}`}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </motion.div>

      {/* ── Section: Top 5 DJs du Mois (Défilement interactif) ── */}
      <motion.div variants={itemVariants}>
        <TopMonthlyDjs artists={topMonthlyDjs} isLoading={monthlyDjsLoading} />
      </motion.div>

      {/* ── Section: Tendances en Afrique ── */}
      <motion.section variants={itemVariants}>
        <SectionHeader
          icon={TrendingUp}
          title={t("section.trending")}
          href="/trending"
          viewAllText={t("btn.viewAll")}
        />
        {trendingLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <MixCardSkeleton key={i} />)}
          </div>
        ) : trendingMixes.length > 0 ? (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {trendingMixes.map((mix) => (
              <motion.div key={mix.id} variants={cardVariants}>
                <MixCard mix={mix} />
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </motion.section>

      {/* ── Section: DJs populaires ── */}
      <motion.section variants={itemVariants}>
        <SectionHeader
          icon={Globe}
          title={t("section.popularDjs")}
          href="/artists"
          viewAllText={t("btn.viewAll")}
        />
        {artistsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <ArtistCardSkeleton key={i} />)}
          </div>
        ) : popularArtists.length > 0 ? (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {popularArtists.map((artist) => (
              <motion.div key={artist.id} variants={cardVariants}>
                <ArtistCard artist={artist} />
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </motion.section>

      {/* ── Section: Nouveaux mixes ── */}
      {(newLoading || newMixes.length > 0) && (
        <motion.section variants={itemVariants}>
          <SectionHeader
            icon={Sparkles}
            title={t("section.newMixes")}
            href="/explore"
            viewAllText={t("btn.viewAll")}
          />
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {newLoading
              ? Array.from({ length: 6 }).map((_, i) => <MixCardSkeleton key={i} />)
              : newMixes.map((mix) => (
                  <motion.div key={mix.id} variants={cardVariants}>
                    <MixCard mix={mix} />
                  </motion.div>
                ))}
          </motion.div>
        </motion.section>
      )}

      {/* ── Section: Découvrir par pays ── */}
      <motion.section variants={itemVariants}>
        <SectionHeader
          icon={Globe}
          title={t("section.countries")}
          href="/explore"
          viewAllText={t("btn.viewAll")}
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {AFRICAN_COUNTRIES.map((country) => (
            <Link
              key={country.code}
              href={`/explore?country=${country.code}`}
              className="group p-4 rounded-2xl bg-surface hover:bg-surface-2 border border-line hover:border-line-strong transition-colors duration-200 flex flex-col items-center text-center"
            >
              {/* Monogramme plutôt que l'emoji drapeau (non rendu sous Windows) */}
              <span className="h-11 w-11 mb-2.5 rounded-full bg-surface-3 border border-line-strong flex items-center justify-center font-display text-sm font-bold text-white group-hover:border-brand/60 group-hover:text-brand transition-colors">
                {country.code}
              </span>
              <p className="text-sm font-semibold text-white truncate max-w-full">
                {t(`country.${country.code}` as TranslationKey, country.name)}
              </p>
              <p className="text-[11px] text-subtle mt-0.5 tabular-nums">
                {country.count} {t("common.mixes")}
              </p>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* ── Section: Genres ── */}
      {genres.length > 0 && (
        <motion.section variants={itemVariants}>
          <SectionHeader
            icon={Music}
            title={t("section.genres")}
            href="/explore"
            viewAllText={t("btn.viewAll")}
          />
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {genres.map((genre, i) => {
              const accent = GENRE_ACCENTS[i % GENRE_ACCENTS.length];
              const Icon = GENRE_ICONS[genre.id] ?? Music;
              return (
                <motion.div key={genre.id} variants={cardVariants}>
                  <Link
                    href={`/explore?genre=${genre.id}`}
                    className="relative h-28 rounded-2xl p-5 bg-surface border border-line hover:border-line-strong transition-colors duration-300 overflow-hidden flex flex-col justify-end group"
                  >
                    {/* Halo coloré propre au genre */}
                    <div
                      className="absolute -top-10 -right-10 h-36 w-36 rounded-full opacity-25 group-hover:opacity-40 blur-2xl transition-opacity duration-300"
                      style={{ background: accent }}
                    />
                    <Icon
                      className="absolute top-4 right-4 h-6 w-6 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                      style={{ color: accent }}
                    />
                    <p className="font-display text-lg font-bold text-white relative pr-10 leading-tight">{genre.label}</p>
                    <p className="text-xs text-muted mt-0.5 relative tabular-nums">{genre.total} {t("common.tracks")}</p>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.section>
      )}
    </motion.div>
  );
}
