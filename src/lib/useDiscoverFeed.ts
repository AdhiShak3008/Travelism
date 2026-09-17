"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { fetchDiscoverPlaces, type DiscoverCard } from "@/lib/liveClient";

// ============================================================================
// useDiscoverFeed — an infinite, live, non-hardcoded feed of real global
// destinations (verified images + real blurbs) fetched from /api/discover.
// Keeps a rolling buffer and prefetches the next batch so the feed never runs
// dry. Auto-advances the "current" card at a set interval.
// ============================================================================

export function useDiscoverFeed(options?: { batch?: number; autoAdvanceMs?: number }) {
  const batch = options?.batch ?? 4;
  const autoAdvanceMs = options?.autoAdvanceMs ?? 6000;

  const [cards, setCards] = useState<DiscoverCard[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const fetching = useRef(false);
  const mounted = useRef(true);

  const loadMore = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    const next = await fetchDiscoverPlaces(batch);
    if (mounted.current && next.length) {
      setCards((prev) => {
        // de-dup by name so the rolling feed doesn't repeat back-to-back
        const seen = new Set(prev.map((c) => c.name));
        const merged = [...prev, ...next.filter((c) => !seen.has(c.name))];
        return merged.slice(-24); // cap buffer
      });
      setLoading(false);
    }
    fetching.current = false;
  }, [batch]);

  // initial load + a second prefetch to fill the buffer
  useEffect(() => {
    mounted.current = true;
    loadMore().then(() => loadMore());
    return () => {
      mounted.current = false;
    };
  }, [loadMore]);

  // auto-advance; prefetch more as we approach the end of the buffer
  useEffect(() => {
    if (cards.length === 0) return;
    const t = setInterval(() => {
      setIndex((i) => {
        const nextIdx = i + 1;
        if (nextIdx >= cards.length - 2) void loadMore();
        return nextIdx % cards.length;
      });
    }, autoAdvanceMs);
    return () => clearInterval(t);
  }, [cards.length, autoAdvanceMs, loadMore]);

  const current = cards[index] ?? null;
  const next = useCallback(() => {
    setIndex((i) => {
      const n = i + 1;
      if (n >= cards.length - 2) void loadMore();
      return cards.length ? n % cards.length : 0;
    });
  }, [cards.length, loadMore]);
  const prev = useCallback(() => {
    setIndex((i) => (cards.length ? (i - 1 + cards.length) % cards.length : 0));
  }, [cards.length]);

  return { cards, current, index, loading, next, prev, loadMore };
}
