"use client";

import { Globe, Heart } from "lucide-react";
import type { FoodItem, GoalType } from "@/lib/db/types";
import { CATEGORY_META } from "@/lib/data/foods";
import { nutritionScore } from "@/lib/domain/nutrition";
import { fmtInt } from "@/lib/utils/format";
import { ScorePill } from "./ScoreBadge";

export function FoodRow({ food, goal, onSelect, favorite, subtitle }: { food: FoodItem; goal: GoalType; onSelect: (f: FoodItem) => void; favorite?: boolean; subtitle?: string }) {
  const score = nutritionScore(food, goal).score;
  const unit = food.unit ?? "g";
  const portionKcal = (food.kcal * food.defaultGrams) / 100;
  return (
    <li>
      <button type="button" onClick={() => onSelect(food)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-white/[0.03] active:scale-[0.99]">
        {food.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={food.image} alt="" loading="lazy" className="size-10 shrink-0 rounded-lg bg-white object-contain" />
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-lg" aria-hidden>
            {CATEGORY_META[food.category].emoji}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-ink">{food.name}</span>
            {favorite && <Heart className="size-3 shrink-0 fill-rose text-rose" aria-label="Favori" />}
            {food.source === "off" && <Globe className="size-3 shrink-0 text-ink-3" aria-label="Open Food Facts" />}
          </span>
          <span className="block truncate text-[11px] text-ink-3">
            {subtitle ?? `${food.brand ? `${food.brand} · ` : ""}${fmtInt(food.kcal)} kcal/100 ${unit} · P ${fmtInt(food.protein)} g`}
          </span>
        </span>
        <ScorePill score={score} />
        <span className="w-16 shrink-0 text-right">
          <span className="block text-sm font-semibold text-ink tabular">{fmtInt(portionKcal)}</span>
          <span className="block text-[10px] text-ink-3">
            {food.defaultGrams} {unit}
          </span>
        </span>
      </button>
    </li>
  );
}
