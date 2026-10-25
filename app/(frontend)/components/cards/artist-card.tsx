"use client";

import Link from "next/link";
import Image from "next/image";
import { UserCheck, Users, Headphones } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ArtistSummary } from "@/types/api";
import { socialApi } from "@/app/(frontend)/lib/api/social";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { formatCount, genreLabel, cn } from "@/app/(frontend)/lib/utils";

interface ArtistCardProps {
  artist: ArtistSummary;
  isFollowing?: boolean;
}

export function ArtistCard({ artist, isFollowing: initialFollowing }: ArtistCardProps) {
  const { user } = useAuth();
  const { t, tr, language } = useI18n();
  const queryClient = useQueryClient();

  const { data: followsData } = useQuery({
    queryKey: ["follows", user?.id, "following-ids"],
    queryFn: async () => {
      if (!user) return [];
      const res = await socialApi.getUserFollows(user.id, "following", 1);
      return (res.data ?? []).map((f) => f.user.id);
    },
    enabled: !!user && initialFollowing === undefined,
    staleTime: 60 * 1000,
  });

  const isFollowed = initialFollowing !== undefined
    ? initialFollowing
    : (followsData ? followsData.includes(artist.userId || artist.id) : false);

  // null = pas encore d'action locale : on suit l'état serveur
  const [followOverride, setFollowOverride] = useState<boolean | null>(null);
  const following = followOverride ?? isFollowed;
  const [imgErr, setImgErr] = useState(false);

  const followMutation = useMutation({
    mutationFn: () => socialApi.toggleFollow(artist.userId || artist.id),
    onSuccess: (res) => {
      setFollowOverride(res.data.following);
      queryClient.invalidateQueries({ queryKey: ["artist", artist.slug] });
      queryClient.invalidateQueries({ queryKey: ["follows"] });
      queryClient.invalidateQueries({ queryKey: ["follows", user?.id, "following-ids"] });
    },
    onError: () => toast.error(tr("Erreur", "Error")),
  });

  const handleFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { toast.error(t("player.loginToFollow")); return; }
    followMutation.mutate();
  };

  return (
    <Link href={`/artists/${artist.slug}`} className="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-surface border border-line hover:bg-surface-2 hover:border-line-strong transition-colors duration-200">
      {/* Avatar */}
      <div className="relative h-20 w-20 rounded-full overflow-hidden bg-surface-3 ring-2 ring-line-strong group-hover:ring-brand/50 transition-all">
        {artist.avatarUrl && !imgErr ? (
          <Image
            src={artist.avatarUrl}
            alt={artist.stageName}
            fill
            className="object-cover"
            sizes="80px"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-surface-3">
            <Headphones className="h-8 w-8 text-subtle" />
          </div>
        )}
        {artist.verified && (
          <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-surface">
            <UserCheck className="h-2.5 w-2.5 text-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-center min-w-0 w-full space-y-0.5">
        <p className="text-sm font-semibold text-white truncate">{artist.stageName}</p>
        <div className="flex items-center justify-center gap-2 text-xs text-muted">
          {artist.country && <span>{artist.country}</span>}
          {artist.availableForBooking && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Booking
            </span>
          )}
        </div>
        <div className="flex items-center justify-center gap-1 text-xs text-subtle tabular-nums">
          <Users className="h-3 w-3" />
          <span>{formatCount(artist.followerCount)}</span>
        </div>
      </div>

      {/* Genres */}
      {artist.genres.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1">
          {artist.genres.slice(0, 2).map((g) => (
            <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-muted">
              {genreLabel(g, language)}
            </span>
          ))}
        </div>
      )}

      {/* Follow button */}
      <button
        onClick={handleFollow}
        disabled={followMutation.isPending}
        className={cn(
          "w-full text-xs font-semibold py-1.5 rounded-full transition-colors",
          following
            ? "bg-transparent text-muted border border-line-strong hover:text-red-400 hover:border-red-500/40"
            : "bg-white text-black border border-transparent hover:bg-zinc-200"
        )}
      >
        {following ? t("btn.following") : t("btn.follow")}
      </button>
    </Link>
  );
}
