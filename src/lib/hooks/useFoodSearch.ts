"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { FOODS, normalize, searchFoods } from "@/lib/data/foods";
import { useCustomFoods } from "@/lib/db/hooks";
import type { FoodItem } from "@/lib/db/types";

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Instant local search + debounced Open Food Facts search for branded products. */
export function useFoodSearch(query: string) {
  const custom = useCustomFoods();
  const local = useMemo(() => searchFoods<FoodItem>([...(custom ?? []), ...FOODS], query, 30), [custom, query]);
  const debounced = useDebounced(query.trim(), 450);
  const [remote, setRemote] = useState<{ q: string; foods: FoodItem[]; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (debounced.length < 3) return;
    let cancelled = false;
    setLoading(true);
    apiFetch<{ foods: FoodItem[] }>(`/api/food/search?q=${encodeURIComponent(debounced)}`)
      .then((r) => !cancelled && setRemote({ q: debounced, foods: r.foods }))
      .catch((e: Error) => !cancelled && setRemote({ q: debounced, foods: [], error: e.message }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const localIds = new Set(local.map((f) => f.barcode ?? f.id));
  const remoteFoods = remote && normalize(remote.q) === normalize(debounced) && debounced.length >= 3 ? remote.foods.filter((f) => !localIds.has(f.barcode ?? f.id)) : [];
  return { local, remote: remoteFoods, loading: loading && debounced.length >= 3, remoteError: remote?.error };
}
