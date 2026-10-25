"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Heart,
  Users,
  ListMusic,
  Sparkles,
  Flame,
  Plus,
  Play,
  Compass,
  Globe,
  Lock,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { RequireAuth } from "@/app/(frontend)/components/auth/require-auth";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { socialApi } from "@/app/(frontend)/lib/api/social";
import { discoveryApi } from "@/app/(frontend)/lib/api/discovery";
import { playlistsApi } from "@/app/(frontend)/lib/api/playlists";
import { MixCard } from "@/app/(frontend)/components/cards/mix-card";
import { ArtistCard } from "@/app/(frontend)/components/cards/artist-card";
import {
  MixCardSkeleton,
  ArtistCardSkeleton,
} from "@/app/(frontend)/components/ui/skeleton";
import { Button } from "@/app/(frontend)/components/ui/button";
import { cn } from "@/app/(frontend)/lib/utils";
import type { ArtistSummary, MixSummary } from "@/types/api";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

const TABS = [
  { id: "likes", label: "Likés", labelEn: "Liked", icon: Heart },
  { id: "follows", label: "DJs suivis", labelEn: "Followed DJs", icon: Users },
  { id: "playlists", label: "Playlists", labelEn: "Playlists", icon: ListMusic },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function LibraryPage() {
  const { tr } = useI18n();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("likes");

  // User likes
  const { data: likesData, isLoading: likesLoading } = useQuery({
    queryKey: ["likes", user?.id],
    queryFn: () => socialApi.getUserLikes(user!.id, "MIX"),
    enabled: !!user && tab === "likes",
  });

  // User follows
  const { data: followsData, isLoading: followsLoading } = useQuery({
    queryKey: ["follows", user?.id, "following"],
    queryFn: () => socialApi.getUserFollows(user!.id, "following"),
    enabled: !!user && tab === "follows",
  });

  // User playlists
  const { data: playlistsData, isLoading: playlistsLoading } = useQuery({
    queryKey: ["playlists", user?.id],
    queryFn: () => playlistsApi.list({ userId: user?.id }),
    enabled: !!user && tab === "playlists",
  });

  // Recommendations: Trending mixes (displayed when likes/playlists are empty)
  const { data: trendingData } = useQuery({
    queryKey: ["discovery", "trending", "library-fallback"],
    queryFn: () => discoveryApi.trending({ limit: 4 }),
    staleTime: 5 * 60 * 1000,
  });

  // Recommendations: Popular artists (displayed when follows are empty)
  const { data: popularData } = useQuery({
    queryKey: ["discovery", "popular", "library-fallback"],
    queryFn: () => discoveryApi.popular({ limit: 4 }),
    staleTime: 5 * 60 * 1000,
  });

  const likedMixes = (likesData?.data ?? [])
    .filter((l) => l.mix)
    .map((l) => l.mix!) as MixSummary[];

  const followedArtists = (followsData?.data ?? [])
    .filter((f) => f.user.artistProfile)
    .map(
      (f) =>
        ({
          id: f.user.artistProfile!.id,
          userId: f.user.id,
          slug: f.user.artistProfile!.slug,
          stageName: f.user.artistProfile!.stageName,
          avatarUrl: f.user.avatarUrl,
          country: null,
          verified: f.user.artistProfile!.verified,
          followerCount: 0,
          genres: [],
        }) as ArtistSummary
    );

  const userPlaylists = playlistsData?.data ?? [];
  const suggestedMixes = trendingData?.data?.mixes ?? [];
  const suggestedArtists = popularData?.data?.artists ?? [];

  return (
    <RequireAuth>
      <div className="px-4 lg:px-8 py-6 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {tr("Ma bibliothèque", "My library")}
          </h1>
          {tab === "playlists" && (
            <Link href="/playlists">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {tr("Gérer les playlists", "Manage playlists")}
              </Button>
            </Link>
          )}
        </div>

        {/* Tabs navigation */}
        <div className="flex gap-1 border-b border-white/[0.06] pb-0.5">
          {TABS.map(({ id, label, labelEn, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px",
                tab === id
                  ? "text-white border-purple-500 text-purple-400"
                  : "text-zinc-500 border-transparent hover:text-zinc-300"
              )}
            >
              <Icon className="h-4 w-4" />
              {tr(label, labelEn)}
            </button>
          ))}
        </div>

        {/* ================= TAB 1: LIKES ================= */}
        {tab === "likes" && (
          <div>
            {likesLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <MixCardSkeleton key={i} />
                ))}
              </div>
            ) : likedMixes.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {likedMixes.map((mix) => (
                  <MixCard key={mix.id} mix={mix} />
                ))}
              </div>
            ) : (
              /* Engaging Empty State with trending recommendations */
              <div className="space-y-6 animate-fade-in">
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-pink-500/10 text-pink-400 flex items-center justify-center flex-shrink-0">
                      <Heart className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">
                        {tr("Aucun coup de cœur pour le moment", "No likes yet")}
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                        {tr("Cliquez sur le cœur d'un mix pour l'ajouter à vos favoris et le retrouver ici.", "Tap the heart on a mix to add it to your favourites and find it here.")}
                      </p>
                    </div>
                  </div>
                  <Link href="/explore">
                    <Button variant="secondary" size="sm" className="gap-2 whitespace-nowrap">
                      <Compass className="h-4 w-4" />
                      {tr("Explorer tout", "Explore all")}
                    </Button>
                  </Link>
                </div>

                {/* Direct Recommendations */}
                {suggestedMixes.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-amber-400" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                        {tr("Mixes tendances recommandés pour vous", "Trending mixes picked for you")}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {suggestedMixes.slice(0, 4).map((mix) => (
                        <MixCard key={mix.id} mix={mix} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: FOLLOWS ================= */}
        {tab === "follows" && (
          <div>
            {followsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ArtistCardSkeleton key={i} />
                ))}
              </div>
            ) : followedArtists.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {followedArtists.map((a) => (
                  <ArtistCard key={a.id} artist={a} isFollowing />
                ))}
              </div>
            ) : (
              /* Engaging Empty State with popular DJs */
              <div className="space-y-6 animate-fade-in">
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">
                        {tr("Vous ne suivez aucun DJ pour l'instant", "You're not following any DJs yet")}
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                        {tr("Abonnez-vous à vos artistes préférés pour ne manquer aucune sortie exclusive.", "Follow your favourite artists so you never miss an exclusive release.")}
                      </p>
                    </div>
                  </div>
                  <Link href="/artists">
                    <Button variant="secondary" size="sm" className="gap-2 whitespace-nowrap">
                      <Users className="h-4 w-4" />
                      {tr("Tous les DJs", "All DJs")}
                    </Button>
                  </Link>
                </div>

                {/* Popular DJs Recommendations */}
                {suggestedArtists.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-400" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                        {tr("DJs populaires à suivre absolument", "Popular DJs worth following")}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {suggestedArtists.slice(0, 4).map((artist) => (
                        <ArtistCard key={artist.id} artist={artist} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: PLAYLISTS ================= */}
        {tab === "playlists" && (
          <div>
            {playlistsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-[80px] rounded-2xl bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            ) : userPlaylists.length > 0 ? (
              <div className="space-y-4">
                {/* Quick stats bar */}
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <ListMusic className="h-3.5 w-3.5 text-purple-400" />
                    {userPlaylists.length} playlist{userPlaylists.length > 1 ? "s" : ""}
                  </span>
                  <span>·</span>
                  <span>
                    {userPlaylists.reduce((sum, p) => sum + p.itemCount, 0)} titre{userPlaylists.reduce((sum, p) => sum + p.itemCount, 0) > 1 ? "s" : ""} au total
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Create new card */}
                  <Link
                    href="/playlists"
                    className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-purple-500/20 hover:border-purple-500/40 bg-purple-500/[0.03] hover:bg-purple-500/[0.06] text-purple-300 hover:text-purple-200 transition-all group min-h-[80px]"
                  >
                    <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-semibold">{tr("Nouvelle playlist", "New playlist")}</span>
                  </Link>

                  {userPlaylists.map((pl) => (
                    <Link
                      key={pl.id}
                      href={`/playlists/${pl.id}`}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.10] transition-all group"
                    >
                      <div className="relative h-14 w-14 rounded-xl overflow-hidden flex-shrink-0 shadow-lg shadow-black/20">
                        {pl.coverUrl ? (
                          <Image
                            src={pl.coverUrl}
                            alt={pl.title}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-900/60 to-pink-900/60">
                            <ListMusic className="h-6 w-6 text-purple-400/60" />
                          </div>
                        )}
                        {/* Play overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="h-4 w-4 text-white fill-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                          {pl.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                          <span>{pl.itemCount} titre{pl.itemCount !== 1 ? "s" : ""}</span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            {pl.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
                      <ListMusic className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">
                        {tr("Aucune playlist créée", "No playlists created")}
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                        {tr("Créez votre première collection musicale et organisez vos mixes et morceaux favoris.", "Create your first music collection and organise your favourite mixes and tracks.")}
                      </p>
                    </div>
                  </div>
                  <Link href="/playlists">
                    <Button size="sm" className="gap-2 whitespace-nowrap">
                      <Plus className="h-4 w-4" />
                      {tr("Créer une playlist", "Create a playlist")}
                    </Button>
                  </Link>
                </div>

                {/* Suggestions for inspiration */}
                {suggestedMixes.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-amber-400" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                        {tr("Idées de mixes à ajouter dans vos playlists", "Mix ideas to add to your playlists")}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {suggestedMixes.slice(0, 4).map((mix) => (
                        <MixCard key={mix.id} mix={mix} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
