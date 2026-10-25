import { useEffect, useRef, useCallback } from "react";

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasNextPage: boolean;
  isFetching: boolean;
  threshold?: number;
}

export function useInfiniteScroll({
  onLoadMore,
  hasNextPage,
  isFetching,
  threshold = 300,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetching) {
        onLoadMore();
      }
    },
    [onLoadMore, hasNextPage, isFetching]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { rootMargin: `${threshold}px` });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver, threshold]);

  return sentinelRef;
}
