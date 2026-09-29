"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { NumberInput } from "@/components/ui/Fields";
import { ensureFoodCached } from "@/lib/db/repos/nutrition";
import type { FoodItem, Ingredient } from "@/lib/db/types";
import { ingredientsTotals } from "@/lib/domain/nutrition";
import { fmtDec, fmtInt } from "@/lib/utils/format";
import { FoodPickerSheet } from "./FoodPickerSheet";

export function foodToIngredient(f: FoodItem, grams = f.defaultGrams): Ingredient {
  return {
    foodId: f.id,
    name: f.name,
    grams,
    per100: { kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, fiber: f.fiber, sugar: f.sugar, satFat: f.satFat, salt: f.salt },
    nova: f.nova,
    category: f.category,
  };
}

/** Editable list of ingredients with live totals (optionally divided in servings). */
export function IngredientEditor({ items, onChange, servings = 1 }: { items: Ingredient[]; onChange: (items: Ingredient[]) => void; servings?: number }) {
  const [picking, setPicking] = useState(false);
  const t = ingredientsTotals(items);
  const s = Math.max(1, servings);
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={`${it.name}-${i}`} className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.02] p-2 pl-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-ink">{it.name}</span>
              <span className="block text-[11px] text-ink-3">{fmtInt((it.per100.kcal * it.grams) / 100)} kcal · P {fmtDec((it.per100.protein * it.grams) / 100)} g</span>
            </span>
            <NumberInput value={it.grams} onChange={(v) => onChange(items.map((x, j) => (j === i ? { ...x, grams: v ?? 0 } : x)))} stepper={false} unit="g" min={0} max={5000} decimals={0} className="w-28" ariaLabel={`Quantité de ${it.name}`} />
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="flex size-9 items-center justify-center rounded-lg text-ink-3 hover:bg-white/5 hover:text-bad" aria-label={`Retirer ${it.name}`}>
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <Button variant="secondary" block onClick={() => setPicking(true)}>
        <Plus /> Ajouter un ingrédient
      </Button>
      {items.length > 0 && (
        <div className="grid grid-cols-4 gap-2 rounded-2xl border border-arise/25 bg-arise/5 p-3 text-center">
          {[
            ["kcal", fmtInt(t.kcal / s)],
            ["Prot.", `${fmtInt(t.protein / s)} g`],
            ["Gluc.", `${fmtInt(t.carbs / s)} g`],
            ["Lip.", `${fmtInt(t.fat / s)} g`],
          ].map(([l, v]) => (
            <div key={l}>
              <p className="font-display text-lg font-semibold text-ink">{v}</p>
              <p className="text-[10px] text-ink-3">
                {l}
                {s > 1 ? " /portion" : ""}
              </p>
            </div>
          ))}
        </div>
      )}
      <FoodPickerSheet
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(f) => {
          if (f.source !== "builtin") void ensureFoodCached(f);
          onChange([...items, foodToIngredient(f)]);
        }}
      />
    </div>
  );
}
