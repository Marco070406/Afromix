"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/app/(frontend)/lib/api/client";
import { socialApi } from "@/app/(frontend)/lib/api/social";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";

/**
 * Global TanStack Query hook that keeps track of which mix IDs the current
 * user has liked.  Follows the same pattern as the `isFollowing` state on
 * artist pages, but lifted into a shared hook for cross-component sync.
 *
 * - queryKey: ["liked-mix-ids", userId]
 * - staleTime: 5 minutes
 * - Optimistic updates: flip cache immediately; rollback on error
 */
export function useLikedMixIds() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // The cache key includes the userId so different users never share state
  const cacheKey = ["liked-mix-ids", user?.id ?? ""];

  const { data: likedIds = new Set<string>(), isLoading } = useQuery({
    queryKey: cacheKey,
    queryFn: async (): Promise<Set<string>> => {
      // pageSize=200 covers the vast majority of users (MVP cap)
      const res = await api.get<Array<{
        id: string;
        targetType: string;
        mix: { id: string } | null;
        track: null;
      }>>(`/users/${user!.id}/likes?type=MIX&page=1&pageSize=200`);

      const ids = new Set<string>();
      for (const item of res.data) {
        if (item.mix?.id) ids.add(item.mix.id);
      }
      return ids;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const toggleMutation = useMutation({
    mutationFn: (mixId: string) => socialApi.toggleLike("MIX", mixId),

    // Optimistic update — flip the set immediately
    onMutate: async (mixId: string) => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const snapshot = queryClient.getQueryData<Set<string>>(cacheKey);

      queryClient.setQueryData<Set<string>>(cacheKey, (prev = new Set()) => {
        const next = new Set(prev);
        if (next.has(mixId)) {
          next.delete(mixId);
        } else {
          next.add(mixId);
        }
        return next;
      });

      return { snapshot };
    },

    // Roll back on network error
    onError: (_err, _mixId, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(cacheKey, context.snapshot);
      }
    },

    // Always resync from server after settle
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cacheKey });
    },
  });

  return {
    /** Set of mix IDs liked by the current user */
    likedIds,
    isLoading,
    /** Toggle like on a mix (optimistic) */
    toggleLike: (mixId: string) => toggleMutation.mutate(mixId),
    isPending: toggleMutation.isPending,
    /** The raw liked status for a specific mix ID */
    isLiked: (mixId: string) => likedIds.has(mixId),
  };
}
