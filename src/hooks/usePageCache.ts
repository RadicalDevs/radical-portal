"use client";

import { useState, useEffect } from "react";

/**
 * Caches a list of items in sessionStorage so navigating back to a page
 * shows data instantly instead of a loading skeleton.
 * Fresh data is still fetched silently in the background.
 */
export function usePageCache<T>(cacheKey: string) {
  const [data, setDataState] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setDataState(JSON.parse(cached) as T[]);
        setLoading(false);
      }
    } catch (e) { console.warn("[usePageCache] read failed:", e); }
  }, [cacheKey]);

  const setData = (newData: T[]) => {
    setDataState(newData);
    setLoading(false);
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(newData));
    } catch (e) { console.warn("[usePageCache] write failed:", e); }
  };

  return { data, setData, loading };
}
