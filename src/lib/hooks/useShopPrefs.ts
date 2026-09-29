"use client";

import type { StoreTier } from "@/lib/data/shop";
import { kvSet } from "@/lib/db/repo";
import { useKv } from "@/lib/db/hooks";
import type { PriceOverrides } from "@/lib/domain/recipes";

const EMPTY: PriceOverrides = {};

/** Store tier used for costs and the user's own pack prices (kept locally). */
export function useShopPrefs() {
  const tier = useKv<StoreTier>("shop:tier") ?? "discount";
  const overrides = useKv<PriceOverrides>("shop:prices") ?? EMPTY;
  return {
    tier,
    overrides,
    setTier: (t: StoreTier) => kvSet("shop:tier", t),
    setPrice: async (itemId: string, price: number | undefined) => {
      const next = { ...overrides };
      if (price == null || !(price > 0)) delete next[itemId];
      else next[itemId] = Math.round(price * 100) / 100;
      await kvSet("shop:prices", next);
    },
  };
}
