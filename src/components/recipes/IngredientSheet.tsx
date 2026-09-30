"use client";

import { ExternalLink, Info, Lightbulb, MapPin, PenLine, RefreshCw, Store, TrendingDown } from "lucide-react";
import { useState } from "react";
import { KitchenIcon } from "@/components/icons/KitchenIcon";
import { Button } from "@/components/ui/Button";
import { Field, NumberInput } from "@/components/ui/Fields";
import { Sheet } from "@/components/ui/Sheet";
import { FOOD_BY_ID } from "@/lib/data/foods";
import { AISLE_META, STORE_TIERS, type ShopItem } from "@/lib/data/shop";
import { apiFetch, ApiError } from "@/lib/api";
import { useResetOnOpen } from "@/lib/hooks/useResetOnOpen";
import { useShopPrefs } from "@/lib/hooks/useShopPrefs";
import { toast } from "@/lib/system/store";
import { formatShort } from "@/lib/utils/date";
import { fmtInt } from "@/lib/utils/format";
import { euro } from "./RecipeCard";

interface LivePrices {
  unit: string;
  organicOnly: boolean;
  observations: number;
  since: string;
  overall: number | null;
  stores: { store: string; median: number; min: number; max: number; count: number; last: string }[];
}

const perKg = (price: number, grams: number) => (price / grams) * 1000;

/** Where to buy an ingredient, indicative prices, real recent prices and the user's own price. */
export function IngredientSheet({ item, open, onClose }: { item: ShopItem | null; open: boolean; onClose: () => void }) {
  const { overrides, setPrice } = useShopPrefs();
  const [mine, setMine] = useState<number | undefined>();
  const [live, setLive] = useState<LivePrices | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useResetOnOpen(
    open,
    () => {
      setMine(item ? overrides[item.id] : undefined);
      setLive(null);
      setError(null);
    },
    item?.id,
  );
  if (!item) return null;
  const food = FOOD_BY_ID.get(item.foodId);
  const aisle = AISLE_META[item.aisle];

  const loadLive = async () => {
    if (!item.openPrices) return;
    setLoading(true);
    setError(null);
    try {
      setLive(await apiFetch<LivePrices>(`/api/prices?category=${encodeURIComponent(item.openPrices)}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Prix indisponibles.");
    } finally {
      setLoading(false);
    }
  };

  const saveMine = async () => {
    await setPrice(item.id, mine);
    toast({ tone: "success", title: mine ? "Ton prix est enregistré" : "Prix indicatif rétabli", message: item.name });
  };

  return (
    <Sheet open={open} onClose={onClose} title={item.name} description={`${aisle.label} · ${item.pack}`} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(["discount", "super"] as const).map((t, idx) => (
            <div key={t} className="rounded-2xl border border-line bg-white/[0.02] p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-2">
                <Store className={idx === 0 ? "size-3.5 text-good" : "size-3.5 text-arise"} /> {STORE_TIERS[t].label}
              </p>
              <p className="mt-1 font-display text-xl font-bold text-ink">≈ {euro(item.price[idx])}</p>
              <p className="text-[11px] text-ink-3">
                {item.packGrams >= 100 ? `soit ${euro(perKg(item.price[idx], item.packGrams))}/kg` : ""}
              </p>
              <p className="mt-1 text-[10px] leading-tight text-ink-3">{STORE_TIERS[t].stores}</p>
            </div>
          ))}
        </div>
        <p className="flex items-start gap-2 text-xs text-ink-3">
          <Info className="mt-0.5 size-3.5 shrink-0" /> Prix indicatifs (estimations 2026) : ils varient selon le magasin, la région et les promotions.
        </p>

        <div className="space-y-2 rounded-2xl border border-line bg-white/[0.02] p-3 text-sm">
          <p className="flex items-center gap-2 text-ink-2">
            <KitchenIcon name={aisle.icon} className="text-arise" /> Rayon : <strong className="text-ink">{aisle.label}</strong>
          </p>
          <p className="flex items-start gap-2 text-ink-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-arise" />
            <span>{item.where ?? "Dans toutes les grandes surfaces : Lidl, Aldi, Carrefour, Leclerc, Auchan, Intermarché, Super U…"}</span>
          </p>
          {item.tip && (
            <p className="flex items-start gap-2 text-ink-2">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-warn" /> {item.tip}
            </p>
          )}
          {food && (
            <p className="text-[11px] text-ink-3">
              Pour 100 g : {fmtInt(food.kcal)} kcal · P {food.protein} · G {food.carbs} · L {food.fat}
            </p>
          )}
        </div>

        {item.openPrices && (
          <div className="rounded-2xl border border-good/30 bg-good/[0.05] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-medium text-ink">
                <TrendingDown className="size-4 text-good" /> Prix relevés en magasin
              </p>
              <Button size="sm" variant="secondary" onClick={loadLive} disabled={loading}>
                <RefreshCw className={loading ? "animate-spin" : undefined} /> {live ? "Actualiser" : "Voir"}
              </Button>
            </div>
            {error && <p className="mt-2 text-xs text-bad">{error}</p>}
            {live && (
              <div className="mt-3">
                {live.stores.length ? (
                  <>
                    <ul className="space-y-1.5">
                      {live.stores.map((s) => (
                        <li key={s.store} className="flex items-center gap-2 text-sm">
                          <span className="min-w-0 flex-1 truncate text-ink">{s.store}</span>
                          <span className="text-[11px] text-ink-3">
                            {s.count} relevé{s.count > 1 ? "s" : ""} · {formatShort(s.last)}
                          </span>
                          <span className="w-20 text-right font-display font-semibold text-good tabular">
                            {euro(s.median)}/{live.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[11px] text-ink-3">
                      Médiane de {live.observations} prix relevés en France depuis le {formatShort(live.since)}
                      {live.organicOnly ? " (bio)" : " (hors bio)"} par la communauté{" "}
                      <a href="https://prices.openfoodfacts.org" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-arise hover:underline">
                        Open Prices <ExternalLink className="size-3" />
                      </a>
                      .
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-ink-3">Pas encore de relevé récent pour ce produit.</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-line bg-white/[0.02] p-3">
          <Field label={`Mon prix pour « ${item.pack} »`} hint="Il remplace le prix indicatif dans les coûts et la liste de courses.">
            <div className="flex gap-2">
              <NumberInput value={mine} onChange={setMine} min={0} max={200} step={0.1} decimals={2} unit="€" className="flex-1" ariaLabel="Mon prix en euros" />
              <Button variant="secondary" onClick={saveMine}>
                <PenLine /> OK
              </Button>
            </div>
          </Field>
        </div>
      </div>
    </Sheet>
  );
}
