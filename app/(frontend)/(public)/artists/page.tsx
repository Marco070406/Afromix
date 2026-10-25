"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { artistsApi } from "@/app/(frontend)/lib/api/artists";
import { ArtistCard } from "@/app/(frontend)/components/cards/artist-card";
import { ArtistCardSkeleton } from "@/app/(frontend)/components/ui/skeleton";
import { EmptyState } from "@/app/(frontend)/components/ui/empty-state";
import { GENRE_LABELS, countryName } from "@/app/(frontend)/lib/utils";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

const COUNTRIES = ["CI", "NG", "GH", "ZA", "CM", "SN", "CD", "KE", "TZ", "BJ", "TG", "BF", "ML", "GN"];

export default function ArtistsPage() {
  const { tr, language } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [country, setCountry] = useState(searchParams.get("country") ?? "");
  const [genre, setGenre] = useState(searchParams.get("genre") ?? "");

  useEffect(() => {
    const p = new URLSearchParams();
    if (country) p.set("country", country);
    if (genre) p.set("genre", genre);
    router.replace(`/artists?${p}`, { scroll: false });
  }, [country, genre, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["artists", country, genre],
    queryFn: () => artistsApi.list({ country: country || undefined, genre: genre || undefined, pageSize: 40 }),
    staleTime: 5 * 60 * 1000,
  });

  const artists = data?.data ?? [];

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-4">{tr("DJs & Artistes", "DJs & Artists")}</h1>

        {/* Country filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-3">
          <button onClick={() => setCountry("")} className={`flex-shrink-0 h-8 px-3 rounded-full text-xs transition-all ${!country ? "bg-white text-black" : "bg-white/[0.06] text-zinc-400 hover:text-white"}`}>
            {tr("Tous", "All")}
          </button>
          {COUNTRIES.map((c) => (
            <button key={c} onClick={() => setCountry(c === country ? "" : c)} className={`flex-shrink-0 h-8 px-3 rounded-full text-xs transition-all ${c === country ? "bg-white text-black" : "bg-white/[0.06] text-zinc-400 hover:text-white"}`}>
              {countryName(c, language)}
            </button>
          ))}
        </div>

        {/* Genre filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button onClick={() => setGenre("")} className={`flex-shrink-0 h-7 px-3 rounded-full text-[11px] transition-all ${!genre ? "bg-purple-600 text-white" : "bg-white/[0.06] text-zinc-500 hover:text-white"}`}>
            {tr("Tous genres", "All genres")}
          </button>
          {Object.entries(GENRE_LABELS).filter(([id]) => id !== "OTHER").map(([id, label]) => (
            <button key={id} onClick={() => setGenre(id === genre ? "" : id)} className={`flex-shrink-0 h-7 px-3 rounded-full text-[11px] transition-all ${id === genre ? "bg-purple-600 text-white" : "bg-white/[0.06] text-zinc-500 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <ArtistCardSkeleton key={i} />)}
        </div>
      ) : artists.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {artists.map((artist) => <ArtistCard key={artist.id} artist={artist} />)}
        </div>
      ) : (
        <EmptyState icon={Users} title={tr("Aucun DJ trouvé", "No DJs found")} description="Essayez avec d'autres filtres." />
      )}
    </div>
  );
}
