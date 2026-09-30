"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip, Field, NumberInput, Segmented } from "@/components/ui/Fields";
import { Sheet } from "@/components/ui/Sheet";
import { logDish, logRecipe } from "@/lib/db/repos/nutrition";
import type { MealSlot, Recipe, SavedMeal } from "@/lib/db/types";
import { ingredientsTotals, MEAL_SLOTS } from "@/lib/domain/nutrition";
import { cue } from "@/lib/system/feedback";
import { toast } from "@/lib/system/store";
import type { DayKey } from "@/lib/utils/date";
import { fmtDec, fmtInt } from "@/lib/utils/format";
import { useResetOnOpen } from "@/lib/hooks/useResetOnOpen";

type Target = { kind: "meal"; meal: SavedMeal } | { kind: "recipe"; recipe: Recipe };

export function LogComposedSheet({ open, onClose, target, date, slot: initialSlot, onLogged }: { open: boolean; onClose: () => void; target: Target | null; date: DayKey; slot: MealSlot; onLogged?: () => void }) {
  const [slot, setSlot] = useState<MealSlot>(initialSlot);
  const [factor, setFactor] = useState<number | undefined>(1);
  const router = useRouter();

  useResetOnOpen(
    open && !!target,
    () => {
      setSlot(target?.kind === "meal" ? (target.meal.defaultSlot ?? initialSlot) : initialSlot);
      setFactor(1);
    },
    target?.kind === "meal" ? target.meal.id : target?.recipe.id,
  );

  if (!target) return null;
  const items = target.kind === "meal" ? target.meal.items : target.recipe.items;
  const totals = ingredientsTotals(items);
  const perUnit = target.kind === "recipe" ? 1 / target.recipe.servings : 1;
  const f = (factor ?? 0) * perUnit;
  const name = target.kind === "meal" ? target.meal.name : target.recipe.name;

  const log = async () => {
    if (!factor || factor <= 0) return;
    // A saved dish lands as one journal entry that keeps its ingredients (editable later).
    if (target.kind === "meal") await logDish({ date, meal: slot, name, items: items.map((it) => ({ ...it, grams: Math.round(it.grams * factor) })), sources: target.meal.sources, dishId: target.meal.id });
    else await logRecipe({ date, meal: slot, recipe: target.recipe, servings: factor });
    cue("set");
    toast({ tone: "success", title: `${name} ajouté`, message: `${fmtInt(totals.kcal * f)} kcal` });
    onLogged?.();
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={name}
      description={target.kind === "recipe" ? `Recette · ${target.recipe.servings} portion(s)` : `Plat enregistré · ${items.length} aliments · « Ajuster » pour changer les quantités ou les aliments`}
      footer={
        <div className="flex gap-2">
          {target.kind === "meal" && (
            <Button variant="secondary" size="lg" onClick={() => router.push(`/nutrition/compose?dish=${target.meal.id}&date=${date}&meal=${slot}`)}>
              <SlidersHorizontal /> Ajuster
            </Button>
          )}
          <Button block size="lg" onClick={log}>
            Ajouter · {fmtInt(totals.kcal * f)} kcal
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {target.kind === "recipe" ? (
          <Field label="Portions consommées">
            <NumberInput value={factor} onChange={setFactor} step={0.5} min={0.25} max={20} size="lg" decimals={2} />
          </Field>
        ) : (
          <div className="flex flex-wrap gap-2">
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((x) => (
              <Chip key={x} active={factor === x} onClick={() => setFactor(x)}>
                ×{String(x).replace(".", ",")}
              </Chip>
            ))}
          </div>
        )}
        <Segmented value={slot} onChange={setSlot} size="sm" ariaLabel="Repas" options={MEAL_SLOTS.map((m) => ({ value: m.id, label: m.label.replace("Petit-déjeuner", "Petit-déj.") }))} />
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            ["kcal", fmtInt(totals.kcal * f)],
            ["Prot.", `${fmtDec(totals.protein * f)} g`],
            ["Gluc.", `${fmtDec(totals.carbs * f)} g`],
            ["Lip.", `${fmtDec(totals.fat * f)} g`],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl border border-line bg-white/[0.02] py-2">
              <p className="font-display font-semibold text-ink">{v}</p>
              <p className="text-[10px] text-ink-3">{l}</p>
            </div>
          ))}
        </div>
        <ul className="divide-y divide-line/50 rounded-xl border border-line">
          {items.map((it, i) => (
            <li key={i} className="flex justify-between gap-3 px-3 py-2 text-sm">
              <span className="truncate text-ink-2">{it.name}</span>
              <span className="shrink-0 text-ink-3 tabular">{fmtInt(it.grams * f)} g</span>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
