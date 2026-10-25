"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  SlidersHorizontal,
  X,
  MapPin,
  Music2,
  ChevronDown,
  ChevronUp,
  Globe,
  Sparkles,
  Radio,
} from "lucide-react";
import { discoveryApi } from "@/app/(frontend)/lib/api/discovery";
import { mixesApi } from "@/app/(frontend)/lib/api/mixes";
import { artistsApi } from "@/app/(frontend)/lib/api/artists";
import { MixCard } from "@/app/(frontend)/components/cards/mix-card";
import { ArtistCard } from "@/app/(frontend)/components/cards/artist-card";
import { MixCardSkeleton, ArtistCardSkeleton } from "@/app/(frontend)/components/ui/skeleton";
import { EmptyState } from "@/app/(frontend)/components/ui/empty-state";
import { AFRICAN_CITIES, SUB_GENRES, cn, countryName } from "@/app/(frontend)/lib/utils";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { GENRES_WITH_ICONS } from "@/app/(frontend)/lib/genre-icons";

const AFRICAN_COUNTRIES = [
  { code: "NG", name: "Nigeria" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "ZA", name: "Afrique du Sud" },
  { code: "GH", name: "Ghana" },
  { code: "SN", name: "Sénégal" },
  { code: "CM", name: "Cameroun" },
  { code: "CD", name: "RD Congo" },
  { code: "TG", name: "Togo" },
  { code: "KE", name: "Kenya" },
  { code: "FR", name: "France" },
];

const TYPES = [
  { id: "all", labelFr: "Tout", labelEn: "All" },
  { id: "mixes", labelFr: "Mixes", labelEn: "Mixes" },
  { id: "tracks", labelFr: "Tracks", labelEn: "Tracks" },
  { id: "artists", labelFr: "DJs & Artistes", labelEn: "DJs & Artists" },
];

type ExploreFilters = {
  q: string; type: string; genre: string; country: string; subGenre: string; city: string;
};

function buildExploreQuery(f: ExploreFilters): string {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.type !== "all") params.set("type", f.type);
  if (f.genre) params.set("genre", f.genre);
  if (f.country) params.set("country", f.country);
  if (f.subGenre) params.set("subGenre", f.subGenre);
  if (f.city) params.set("city", f.city);
  return params.toString();
}

// Comparaison indépendante de l'ordre des paramètres
const normalizeQuery = (query: string) => new URLSearchParams([...new URLSearchParams(query)].sort()).toString();

function ExploreContent() {
  const { language } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [type, setType] = useState(searchParams.get("type") ?? "all");
  const [genre, setGenre] = useState(searchParams.get("genre") ?? "");
  const [country, setCountry] = useState(searchParams.get("country") ?? "");
  const [subGenre, setSubGenre] = useState(searchParams.get("subGenre") ?? "");
  const [city, setCity] = useState(searchParams.get("city") ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [debouncedQ, setDebouncedQ] = useState(q);

  // Navigation externe (lien genre/pays, retour arrière) : on reprend les filtres de l'URL.
  // Les changements d'URL issus de nos propres router.replace sont ignorés, sinon la
  // valeur "debouncée" écraserait les caractères tapés entre-temps.
  const paramsKey = searchParams.toString();
  const [prevParamsKey, setPrevParamsKey] = useState(paramsKey);
  if (paramsKey !== prevParamsKey) {
    setPrevParamsKey(paramsKey);
    const ownQuery = buildExploreQuery({ q: debouncedQ, type, genre, country, subGenre, city });
    if (normalizeQuery(paramsKey) !== normalizeQuery(ownQuery)) {
      const urlQ = searchParams.get("q") ?? "";
      setQ(urlQ);
      setDebouncedQ(urlQ);
      setType(searchParams.get("type") ?? "all");
      setGenre(searchParams.get("genre") ?? "");
      setCountry(searchParams.get("country") ?? "");
      setSubGenre(searchParams.get("subGenre") ?? "");
      setCity(searchParams.get("city") ?? "");
    }
  }

  // Sous-genre incompatible avec le genre choisi : on le retire
  if (genre && subGenre && !SUB_GENRES[genre]?.includes(subGenre)) {
    setSubGenre("");
  }

  // Debounce search query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(q), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  // Sync URL state
  useEffect(() => {
    const newQuery = buildExploreQuery({ q: debouncedQ, type, genre, country, subGenre, city });
    if (normalizeQuery(newQuery) !== normalizeQuery(searchParams.toString())) {
      router.replace(`/explore${newQuery ? `?${newQuery}` : ""}`, { scroll: false });
    }
  }, [debouncedQ, type, genre, country, subGenre, city, router, searchParams]);

  const hasSearchText = debouncedQ.trim().length >= 1;

  // 1. Text Search Query (when user types)
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ["search", debouncedQ, type, genre, country, subGenre, city],
    queryFn: () =>
      discoveryApi.search({
        q: debouncedQ,
        type: type as "all",
        genre: genre || undefined,
        country: country || undefined,
        subGenre: subGenre || undefined,
        city: city || undefined,
        pageSize: 20,
      }),
    enabled: hasSearchText,
    staleTime: 30_000,
  });

  // 2. Filtered Listing Query (when browsing by genre or country without text query)
  const { data: filteredMixesData, isLoading: mixesLoading } = useQuery({
    queryKey: ["explore-mixes", genre, country, city],
    queryFn: () =>
      mixesApi.list({
        genre: genre || undefined,
        country: country || undefined,
        pageSize: 24,
      }),
    enabled: !hasSearchText && type !== "artists",
    staleTime: 60_000,
  });

  const { data: filteredArtistsData, isLoading: artistsLoading } = useQuery({
    queryKey: ["explore-artists", genre, country, city],
    queryFn: () =>
      artistsApi.list({
        genre: genre || undefined,
        country: country || undefined,
        pageSize: 16,
      }),
    enabled: !hasSearchText && (type === "all" || type === "artists"),
    staleTime: 60_000,
  });

  const searchResults = searchData?.data;
  const filteredMixes = filteredMixesData?.data ?? [];
  const filteredArtists = filteredArtistsData?.data ?? [];
  const currentSubGenres = genre ? SUB_GENRES[genre] ?? [] : [];

  const selectedCountryObj = AFRICAN_COUNTRIES.find((c) => c.code === country);
  const selectedGenreObj = GENRES_WITH_ICONS.find((g) => g.id === genre);
  const hasActiveFilters = !!(genre || country || subGenre || city);

  const clearAllFilters = () => {
    setQ("");
    setDebouncedQ("");
    setGenre("");
    setCountry("");
    setSubGenre("");
    setCity("");
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>{language === "fr" ? "Explorer & Découvrir" : "Explore & Discover"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {language === "fr"
              ? "Parcourez les mixes et les DJs par genre musical et par pays."
              : "Discover mixes and DJs filtered by musical genre and African country."}
          </p>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="self-start sm:self-auto text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/10 border border-purple-500/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            <span>{language === "fr" ? "Réinitialiser tous les filtres" : "Reset all filters"}</span>
          </button>
        )}
      </div>

      {/* Main Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none z-10" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              language === "fr"
                ? "Rechercher par titre, artiste, club, mots-clés..."
                : "Search by title, DJ, venue, tags..."
            }
            style={{ paddingLeft: "44px", paddingRight: "40px" }}
            className="w-full h-12 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "h-12 px-4 rounded-2xl flex items-center gap-2 border text-sm font-semibold transition-all relative",
            showFilters || hasActiveFilters
              ? "bg-purple-600/20 border-purple-500/40 text-purple-300"
              : "bg-white/[0.06] border-white/[0.08] text-zinc-400 hover:text-white"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">{language === "fr" ? "Filtres avancés" : "Filters"}</span>
          {hasActiveFilters && (
            <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* ─── GENRE HORIZONTAL / EXPANDABLE BAR ───────────────────────────── */}
      <div className="space-y-2">
        <div
          className={cn(
            "gap-2 items-center pb-2 transition-all",
            showAllGenres
              ? "flex flex-wrap"
              : "flex overflow-x-auto no-scrollbar"
          )}
        >
          <button
            onClick={() => {
              setGenre("");
              setSubGenre("");
            }}
            className={cn(
              "flex-shrink-0 h-9 px-4 rounded-full text-xs font-bold transition-all flex items-center gap-1.5",
              !genre
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-2 ring-purple-400/20"
                : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{language === "fr" ? "Tous les genres" : "All genres"}</span>
          </button>

          {GENRES_WITH_ICONS.map((g) => {
            const isSelected = genre === g.id;
            const Icon = g.icon;
            return (
              <button
                key={g.id}
                onClick={() => {
                  setGenre(isSelected ? "" : g.id);
                  setSubGenre("");
                }}
                className={cn(
                  "flex-shrink-0 h-9 px-4 rounded-full text-xs font-bold transition-all flex items-center gap-2",
                  isSelected
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-2 ring-purple-400/20"
                    : "bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isSelected ? "text-white" : "text-purple-400")} />
                <span>{g.name}</span>
              </button>
            );
          })}

          {/* Voir plus / Voir moins button */}
          <button
            type="button"
            onClick={() => setShowAllGenres(!showAllGenres)}
            className="flex-shrink-0 h-9 px-3.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 bg-purple-600/10 text-purple-300 hover:text-white hover:bg-purple-600/30 border border-purple-500/30 hover:border-purple-500/60 shadow-sm"
          >
            {showAllGenres ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                <span>{language === "fr" ? "Voir moins" : "Show less"}</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                <span>{language === "fr" ? "Voir plus" : "Show more"}</span>
              </>
            )}
          </button>
        </div>

        {/* Sub-genres bar if available */}
        {currentSubGenres.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 pl-1 no-scrollbar animate-fade-in">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pr-1">
              {language === "fr" ? "Sous-genres :" : "Sub-genres:"}
            </span>
            {currentSubGenres.map((sg) => (
              <button
                key={sg}
                onClick={() => setSubGenre(sg === subGenre ? "" : sg)}
                className={cn(
                  "flex-shrink-0 h-6 px-3 rounded-full text-[11px] font-semibold transition-all",
                  sg === subGenre
                    ? "bg-pink-600 text-white shadow-sm"
                    : "bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.07] border border-white/[0.05]"
                )}
              >
                {sg}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── COUNTRY SELECTOR ──────────────────────────────────────────────── */}
      <div
        className={cn(
          "gap-1.5 items-center pb-1 transition-all",
          showAllCountries ? "flex flex-wrap" : "flex overflow-x-auto no-scrollbar"
        )}
      >
        <span className="text-xs font-bold text-zinc-400 flex items-center gap-1 pr-2 flex-shrink-0">
          <Globe className="h-3.5 w-3.5 text-purple-400" />
          <span>{language === "fr" ? "Pays :" : "Country:"}</span>
        </span>

        <button
          onClick={() => setCountry("")}
          className={cn(
            "flex-shrink-0 h-7 px-3 rounded-full text-xs font-semibold transition-all",
            !country
              ? "bg-white text-black font-bold"
              : "bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.06]"
          )}
        >
          {language === "fr" ? "Monde entier" : "Worldwide"}
        </button>

        {AFRICAN_COUNTRIES.map((c) => {
          const isSelected = country === c.code;
          return (
            <button
              key={c.code}
              onClick={() => setCountry(isSelected ? "" : c.code)}
              className={cn(
                "flex-shrink-0 h-7 px-3 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5",
                isSelected
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-md shadow-purple-600/20"
                  : "bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
              )}
            >
              <span className="text-[10px] font-mono font-bold px-1 py-0.2 rounded bg-white/10 text-purple-300">
                {c.code}
              </span>
              <span>{countryName(c.code, language)}</span>
            </button>
          );
        })}

        {/* Voir plus / Voir moins button for countries */}
        <button
          type="button"
          onClick={() => setShowAllCountries(!showAllCountries)}
          className="flex-shrink-0 h-7 px-2.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 bg-purple-600/10 text-purple-300 hover:text-white hover:bg-purple-600/30 border border-purple-500/30"
        >
          {showAllCountries ? (
            <>
              <ChevronUp className="h-3 w-3" />
              <span>{language === "fr" ? "Voir moins" : "Show less"}</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              <span>{language === "fr" ? "Voir plus" : "Show more"}</span>
            </>
          )}
        </button>
      </div>

      {/* ─── CONTENT TYPE TABS ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div className="flex gap-1.5">
          {TYPES.map((item) => (
            <button
              key={item.id}
              onClick={() => setType(item.id)}
              className={cn(
                "h-8 px-3.5 rounded-xl text-xs font-bold transition-all",
                type === item.id
                  ? "bg-white/[0.12] text-white border border-white/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              {language === "fr" ? item.labelFr : item.labelEn}
            </button>
          ))}
        </div>

        {/* Active filters pill list */}
        {hasActiveFilters && (
          <div className="hidden sm:flex items-center gap-2">
            {selectedGenreObj && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold">
                <selectedGenreObj.icon className="h-3 w-3" />
                <span>{selectedGenreObj.name}</span>
                <button onClick={() => setGenre("")} className="hover:text-white ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedCountryObj && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/30 font-semibold">
                <span className="font-mono font-bold text-[10px]">{selectedCountryObj.code}</span>
                <span>{countryName(selectedCountryObj.code, language)}</span>
                <button onClick={() => setCountry("")} className="hover:text-white ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ─── ADVANCED FILTERS PANEL ─────────────────────────────────────────── */}
      {showFilters && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <MapPin className="h-3.5 w-3.5 text-pink-400" />
            <span>{language === "fr" ? "Villes & Métropoles phares" : "Major Cities"}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {AFRICAN_CITIES.map((c) => (
              <button
                key={c.city}
                onClick={() => setCity(city === c.city ? "" : c.city)}
                className={cn(
                  "h-7 px-3 rounded-full text-xs font-medium transition-all",
                  city === c.city
                    ? "bg-pink-600 text-white font-bold"
                    : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                )}
              >
                {c.city} ({c.country})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── DISPLAY RESULTS ───────────────────────────────────────────────── */}
      {hasSearchText ? (
        /* MODE A : Résultat de recherche textuelle */
        <div className="space-y-8">
          {searchLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <MixCardSkeleton key={i} />
              ))}
            </div>
          ) : !searchResults ||
            (searchResults.mixes.length === 0 && searchResults.artists.length === 0) ? (
            <EmptyState
              title={language === "fr" ? "Aucun résultat trouvé" : "No results found"}
              description={
                language === "fr"
                  ? `Aucun mix ou DJ ne correspond à votre recherche « ${debouncedQ} » avec les filtres sélectionnés.`
                  : `No mixes or DJs matched "${debouncedQ}" with current filters.`
              }
              action={{
                label: language === "fr" ? "Réinitialiser les filtres" : "Clear filters",
                onClick: clearAllFilters,
              }}
            />
          ) : (
            <>
              {/* Mixes Results */}
              {(type === "all" || type === "mixes") && searchResults.mixes.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Music2 className="h-4 w-4 text-purple-400" />
                    <span>
                      {language === "fr" ? "Mixes correspondants" : "Matching Mixes"} (
                      {searchResults.mixes.length})
                    </span>
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {searchResults.mixes.map((mix) => (
                      <MixCard key={mix.id} mix={mix} />
                    ))}
                  </div>
                </div>
              )}

              {/* Artists Results */}
              {(type === "all" || type === "artists") && searchResults.artists.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Radio className="h-4 w-4 text-pink-400" />
                    <span>
                      {language === "fr" ? "DJs & Créateurs" : "DJs & Creators"} (
                      {searchResults.artists.length})
                    </span>
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {searchResults.artists.map((artist) => (
                      <ArtistCard key={artist.id} artist={artist} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* MODE B : Navigation par filtres (Genre & Pays) */
        <div className="space-y-8">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {selectedGenreObj && <selectedGenreObj.icon className="h-4 w-4 text-purple-400" />}
              <span>
                {selectedGenreObj
                  ? selectedGenreObj.name
                  : language === "fr"
                  ? "Mixes du moment"
                  : "Trending Mixes"}
              </span>
              {selectedCountryObj && (
                <span className="text-zinc-400 font-normal">
                  · {countryName(selectedCountryObj.code, language)}
                </span>
              )}
            </h2>
            <span className="text-xs text-zinc-500">
              {filteredMixes.length} {language === "fr" ? "mixes disponibles" : "mixes available"}
            </span>
          </div>

          {/* Mixes Grid */}
          {type !== "artists" && (
            <div>
              {mixesLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <MixCardSkeleton key={i} />
                  ))}
                </div>
              ) : filteredMixes.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {filteredMixes.map((mix) => (
                    <MixCard key={mix.id} mix={mix} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={language === "fr" ? "Aucun mix pour ce filtre" : "No mixes for this filter"}
                  description={
                    language === "fr"
                      ? "Soyez le premier DJ à publier un mix dans cette catégorie !"
                      : "Be the first DJ to upload a mix in this category!"
                  }
                  action={{
                    label: language === "fr" ? "Téléverser un mix" : "Upload a mix",
                    onClick: () => router.push("/upload"),
                  }}
                />
              )}
            </div>
          )}

          {/* Artists Section */}
          {(type === "all" || type === "artists") && (artistsLoading || filteredArtists.length > 0) && (
            <div className="space-y-4 pt-4 border-t border-white/[0.06]">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Radio className="h-4 w-4 text-purple-400" />
                <span>
                  {language === "fr" ? "DJs en vedette" : "Featured DJs"}
                  {selectedCountryObj ? ` (${countryName(selectedCountryObj.code, language)})` : ""}
                </span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {artistsLoading
                  ? Array.from({ length: 4 }).map((_, i) => <ArtistCardSkeleton key={i} />)
                  : filteredArtists.map((artist) => (
                      <ArtistCard key={artist.id} artist={artist} />
                    ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto space-y-6 animate-pulse">
          <div className="h-10 w-48 bg-white/5 rounded-2xl" />
          <div className="h-12 w-full bg-white/5 rounded-2xl" />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square bg-white/5 rounded-2xl" />
            ))}
          </div>
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
