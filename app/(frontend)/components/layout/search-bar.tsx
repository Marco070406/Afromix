"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  X,
  Loader2,
  Music2,
  User,
  ArrowRight,
  Play,
  Pause,
  Sparkles,
  Globe,
  Flame,
  Music,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { mixesApi } from "@/app/(frontend)/lib/api/mixes";
import { artistsApi } from "@/app/(frontend)/lib/api/artists";
import { usePlayer } from "@/app/(frontend)/providers/player-provider";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { formatDuration, genreLabel } from "@/app/(frontend)/lib/utils";
import { GENRES_WITH_ICONS } from "@/app/(frontend)/lib/genre-icons";

const ALL_GENRES = GENRES_WITH_ICONS;

const ALL_COUNTRIES = [
  { code: "NG", name: "Nigeria" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "ZA", name: "Afrique du Sud" },
  { code: "GH", name: "Ghana" },
  { code: "SN", name: "Sénégal" },
  { code: "CM", name: "Cameroun" },
  { code: "CD", name: "RD Congo" },
  { code: "TG", name: "Togo" },
  { code: "KE", name: "Kenya" },
  { code: "FR", name: "France (Diaspora)" },
];

export function SearchBar() {
  const router = useRouter();
  const { play, track: currentTrack, isPlaying, togglePlay } = usePlayer();
  const { language, t, tr } = useI18n();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce query (250ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isQueryValid = debouncedQuery.length >= 2;

  // Mixes search
  const { data: mixesData, isLoading: loadingMixes } = useQuery({
    queryKey: ["search-suggest-mixes", debouncedQuery],
    queryFn: () => mixesApi.list({ q: debouncedQuery, pageSize: 4 }),
    enabled: isQueryValid,
    staleTime: 30_000,
  });

  // Artists search
  const { data: artistsData, isLoading: loadingArtists } = useQuery({
    queryKey: ["search-suggest-artists", debouncedQuery],
    queryFn: () => artistsApi.list({ q: debouncedQuery, pageSize: 3 }),
    enabled: isQueryValid,
    staleTime: 30_000,
  });

  const mixes = mixesData?.data ?? [];
  const artists = artistsData?.data ?? [];
  const isLoading = (loadingMixes || loadingArtists) && isQueryValid;

  // Matching genres based on query
  const matchingGenres = debouncedQuery
    ? ALL_GENRES.filter((g) =>
        g.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        g.id.toLowerCase().includes(debouncedQuery.toLowerCase())
      )
    : [];

  // Matching countries based on query
  const matchingCountries = debouncedQuery
    ? ALL_COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        c.code.toLowerCase() === debouncedQuery.toLowerCase()
      )
    : [];

  const hasResults =
    mixes.length > 0 ||
    artists.length > 0 ||
    matchingGenres.length > 0 ||
    matchingCountries.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length > 0) {
      setIsOpen(false);
      router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleClear = () => {
    setQuery("");
    setDebouncedQuery("");
    setIsOpen(false);
  };

  const handleSelectGenre = (genreId: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(`/explore?genre=${genreId}`);
  };

  const handleSelectCountry = (countryCode: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(`/explore?country=${countryCode}`);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none z-10" />
        <input
          type="text"
          value={query}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsOpen(false);
          }}
          placeholder={language === "fr" ? "Chercher mixes, DJs, genres, pays..." : "Search mixes, DJs, genres, countries..."}
          style={{ paddingLeft: "44px", paddingRight: "40px" }}
          className="w-full h-10 rounded-full bg-white/[0.07] border border-white/[0.08] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner"
        />

        {isLoading ? (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400 animate-spin" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </form>

      {/* Dropdown Suggestions */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-[#111318]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl overflow-hidden animate-fade-in-up">
          {/* Quick Explore view on Focus (when query is empty or 1 char) */}
          {!isQueryValid ? (
            <div className="p-4 space-y-4">
              {/* Popular Genres */}
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  <Flame className="h-3.5 w-3.5 text-amber-400" />
                  <span>{language === "fr" ? "Genres populaires" : "Popular Genres"}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_GENRES.slice(0, 6).map((g) => {
                    const Icon = g.icon;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleSelectGenre(g.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-white hover:bg-purple-600/20 hover:border-purple-500/30 transition-all"
                      >
                        <Icon className="h-3 w-3 text-purple-400" />
                        <span>{g.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Popular Countries */}
              <div className="pt-2 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  <Globe className="h-3.5 w-3.5 text-purple-400" />
                  <span>{language === "fr" ? "Explorer par Pays" : "Explore by Country"}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_COUNTRIES.slice(0, 6).map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelectCountry(c.code)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all"
                    >
                      <span className="text-[10px] font-mono font-bold px-1 py-0.2 rounded bg-white/10 text-purple-300">
                        {c.code}
                      </span>
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : isLoading && !hasResults ? (
            <div className="p-6 flex items-center justify-center gap-3 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
              <span>{t("search.searching")}</span>
            </div>
          ) : !hasResults ? (
            <div className="p-6 text-center text-sm text-zinc-400">
              <p>
                {t("search.noResults")}{" "}
                <span className="text-white font-medium">« {debouncedQuery} »</span>
              </p>
              <Link
                href={`/explore?q=${encodeURIComponent(debouncedQuery)}`}
                onClick={() => setIsOpen(false)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium"
              >
                <span>{t("search.exploreDeep")}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06] max-h-[75vh] overflow-y-auto">
              {/* Instant Matching Genres */}
              {matchingGenres.length > 0 && (
                <div className="p-3 bg-purple-500/5">
                  <div className="flex items-center gap-1.5 px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-purple-300">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                    <span>{language === "fr" ? "Genres correspondants" : "Matching Genres"}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {matchingGenres.map((g) => {
                      const Icon = g.icon;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => handleSelectGenre(g.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{g.name}</span>
                          <ArrowRight className="h-3 w-3 opacity-60" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Instant Matching Countries */}
              {matchingCountries.length > 0 && (
                <div className="p-3 bg-white/[0.02]">
                  <div className="flex items-center gap-1.5 px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-pink-300">
                    <Globe className="h-3.5 w-3.5 text-pink-400" />
                    <span>{language === "fr" ? "Pays correspondants" : "Matching Countries"}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {matchingCountries.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleSelectCountry(c.code)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-pink-600/20 text-pink-300 border border-pink-500/30 hover:bg-pink-600 hover:text-white transition-all"
                      >
                        <span className="text-[10px] font-mono font-bold px-1 py-0.2 rounded bg-white/10 text-pink-300">
                          {c.code}
                        </span>
                        <span>{c.name}</span>
                        <ArrowRight className="h-3 w-3 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mixes Section */}
              {mixes.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center justify-between px-2 pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Music2 className="h-3.5 w-3.5 text-purple-400" />
                      <span>{t("search.mixes")}</span>
                    </span>
                    <span className="text-[11px] text-zinc-500">{mixes.length}</span>
                  </div>

                  <div className="space-y-1">
                    {mixes.map((mix) => {
                      const isCurrentTrack = currentTrack?.id === mix.id;
                      const isCurrentlyPlaying = isCurrentTrack && isPlaying;

                      return (
                        <div
                          key={mix.id}
                          className="group flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.06] transition-colors relative"
                        >
                          {/* Thumbnail / Play button */}
                          <div className="relative h-11 w-11 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                            {mix.coverUrl ? (
                              <Image
                                src={mix.coverUrl}
                                alt={mix.title}
                                fill
                                className="object-cover"
                                sizes="44px"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-purple-900/40 text-sm">
                                <Music className="h-4 w-4 text-purple-300" />
                              </div>
                            )}

                            {/* Play overlay */}
                            {mix.audioUrl && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (isCurrentTrack) {
                                    togglePlay();
                                  } else {
                                    play({
                                      id: mix.id,
                                      title: mix.title,
                                      audioUrl: mix.audioUrl!,
                                      coverUrl: mix.coverUrl,
                                      slug: mix.slug,
                                      durationSec: mix.durationSec,
                                      artist: mix.artist
                                        ? {
                                            id: mix.artist.id,
                                            slug: mix.artist.slug,
                                            stageName: mix.artist.stageName,
                                            avatarUrl: mix.artist.avatarUrl,
                                          }
                                        : {
                                            id: "",
                                            slug: "",
                                            stageName: "Artiste",
                                            avatarUrl: null,
                                          },
                                      type: "mix",
                                    });
                                  }
                                }}
                                className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity ${
                                  isCurrentlyPlaying
                                    ? "opacity-100 text-purple-400"
                                    : "opacity-0 group-hover:opacity-100 text-white"
                                }`}
                                aria-label={tr("Jouer", "Play")}
                              >
                                {isCurrentlyPlaying ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4 fill-current ml-0.5" />
                                )}
                              </button>
                            )}
                          </div>

                          {/* Info */}
                          <Link
                            href={`/mixes/${mix.slug}`}
                            onClick={() => setIsOpen(false)}
                            className="flex-1 min-w-0"
                          >
                            <p className="text-sm font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                              {mix.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                              {mix.artist && <span className="truncate">{mix.artist.stageName}</span>}
                              {mix.genre && (
                                <>
                                  <span className="text-zinc-600">•</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.08] text-zinc-300">
                                    {genreLabel(mix.genre, language)}
                                  </span>
                                </>
                              )}
                            </div>
                          </Link>

                          {/* Duration */}
                          {mix.durationSec && (
                            <span className="text-xs text-zinc-500 pr-1 flex-shrink-0">
                              {formatDuration(mix.durationSec)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Artists Section */}
              {artists.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center justify-between px-2 pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-pink-400" />
                      <span>{t("search.artists")}</span>
                    </span>
                  </div>
                  <div className="space-y-1">
                    {artists.map((artist) => (
                      <Link
                        key={artist.id}
                        href={`/artists/${artist.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="group flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.06] transition-colors"
                      >
                        <div className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0 bg-zinc-800">
                          {artist.avatarUrl ? (
                            <Image
                              src={artist.avatarUrl}
                              alt={artist.stageName}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-pink-900/40 text-xs font-bold text-pink-300">
                              {artist.stageName[0]}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate group-hover:text-pink-300 transition-colors">
                            {artist.stageName}
                          </p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {artist.country ? `${artist.country} • ` : ""}
                            {tr("DJ / Artiste", "DJ / Artist")}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 transition-colors pr-1" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* View all footer */}
              <Link
                href={`/explore?q=${encodeURIComponent(debouncedQuery)}`}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.06] text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
              >
                <span>
                  {t("search.viewAll")} (« {debouncedQuery} »)
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
