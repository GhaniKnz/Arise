"use client";

import { Heart, Trash2, UtensilsCrossed } from "lucide-react";
import { useMemo, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { Button, IconButton } from "@/components/ui/Button";
import { Chip, Field, NumberInput, Segmented } from "@/components/ui/Fields";
import { Sheet } from "@/components/ui/Sheet";
import { CATEGORY_META } from "@/lib/data/foods";
import { useFavoriteIds, useKv } from "@/lib/db/hooks";
import { DRAFT_KEY, type DishDraft } from "@/lib/db/repos/dishDraft";
import { deleteEntries, logFood, toggleFavorite, updateEntryGrams } from "@/lib/db/repos/nutrition";
import type { EntrySource, FoodEntry, FoodItem, MealSlot } from "@/lib/db/types";
import { MEAL_SLOTS, nutritionScore, scaleNutrients } from "@/lib/domain/nutrition";
import { cue } from "@/lib/system/feedback";
import { toast } from "@/lib/system/store";
import { cn } from "@/lib/utils/cn";
import { relativeDayLabel, type DayKey } from "@/lib/utils/date";
import { fmtDec, fmtInt } from "@/lib/utils/format";
import { ScorePanel } from "./ScoreBadge";
import { useResetOnOpen } from "@/lib/hooks/useResetOnOpen";

interface Props {
  open: boolean;
  onClose: () => void;
  food: FoodItem | null;
  date: DayKey;
  meal: MealSlot;
  /** When set, the sheet edits this entry instead of adding. */
  entry?: FoodEntry | null;
  source?: EntrySource;
  onAdded?: (entry: FoodEntry) => void;
  /** When set, offers to put the food in a composed dish instead of logging it alone. */
  onAddToDish?: (food: FoodItem, grams: number) => void;
}

export function FoodSheet({ open, onClose, food, date, meal: initialMeal, entry, source, onAdded, onAddToDish }: Props) {
  const { profile } = useGame();
  const favIds = useFavoriteIds();
  const dishDraft = useKv<DishDraft>(DRAFT_KEY.new);
  const [grams, setGrams] = useState<number | undefined>(100);
  const [meal, setMeal] = useState<MealSlot>(initialMeal);
  const [saving, setSaving] = useState(false);

  useResetOnOpen(
    open,
    () => {
      setGrams(entry?.grams ?? food?.defaultGrams ?? 100);
      setMeal(entry?.meal ?? initialMeal);
    },
    entry?.id ?? food?.id,
  );

  const per100 = entry?.per100 ?? food ?? null;
  const n = useMemo(() => (per100 ? scaleNutrients(per100, grams ?? 0) : null), [per100, grams]);
  const score = useMemo(() => (per100 ? nutritionScore({ ...per100, nova: food?.nova ?? entry?.nova, category: food?.category ?? entry?.category, unit: food?.unit, alcohol: food?.alcohol }, profile?.goal) : null), [per100, food, entry, profile?.goal]);

  if (!per100) return null;
  const name = entry?.name ?? food?.name ?? "";
  const unit = food?.unit ?? "g";
  const isFav = food ? favIds?.has(food.id) : false;
  const portions = food?.portions ?? [];

  const submit = async () => {
    if (!grams || grams <= 0) {
      toast({ tone: "error", title: "Quantité invalide" });
      return;
    }
    setSaving(true);
    try {
      if (entry) {
        await updateEntryGrams(entry, grams, meal);
        toast({ tone: "success", title: "Entrée modifiée", message: name });
      } else if (food) {
        const created = await logFood({ date, meal, food, grams, source: source ?? "search" });
        cue("set");
        toast({ tone: "success", title: `${name} ajouté`, message: `${fmtInt(created.kcal)} kcal · ${MEAL_SLOTS.find((m) => m.id === meal)?.label}` });
        onAdded?.(created);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!entry) return;
    await deleteEntries([entry.id]);
    toast({ tone: "success", title: "Entrée supprimée", message: name });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="md"
      title={name}
      description={[food?.brand ?? entry?.brand, food ? `${CATEGORY_META[food.category].emoji} ${CATEGORY_META[food.category].label}` : null, relativeDayLabel(date)].filter(Boolean).join(" · ")}
      footer={
        <div className="flex gap-2">
          {entry && (
            <IconButton label="Supprimer l'entrée" variant="secondary" size="lg" onClick={remove} className="text-bad">
              <Trash2 />
            </IconButton>
          )}
          {food && (
            <IconButton label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"} variant="secondary" size="lg" onClick={() => toggleFavorite(food.id, food)} className={cn(isFav && "text-rose")}>
              <Heart className={cn(isFav && "fill-current")} />
            </IconButton>
          )}
          <Button block size="lg" onClick={submit} disabled={saving}>
            {entry ? "Mettre à jour" : `Ajouter · ${fmtInt(n?.kcal ?? 0)} kcal`}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label={`Quantité (${unit})`}>
          <NumberInput value={grams} onChange={setGrams} step={unit === "ml" ? 50 : 10} min={0} max={5000} unit={unit} size="lg" decimals={0} />
        </Field>
        <div className="flex flex-wrap gap-2">
          {portions.map((p) => (
            <Chip key={p.label} active={grams === p.grams} onClick={() => setGrams(p.grams)}>
              {p.label} · {p.grams} {unit}
            </Chip>
          ))}
          {[50, 100, 150, 200].filter((g) => !portions.some((p) => p.grams === g)).map((g) => (
            <Chip key={g} active={grams === g} onClick={() => setGrams(g)}>
              {g} {unit}
            </Chip>
          ))}
        </div>

        <Segmented value={meal} onChange={setMeal} size="sm" ariaLabel="Repas" options={MEAL_SLOTS.map((m) => ({ value: m.id, label: m.label.replace("Petit-déjeuner", "Petit-déj.") }))} />

        {food && !entry && onAddToDish && (
          <button
            type="button"
            onClick={() => grams && grams > 0 && onAddToDish(food, grams)}
            className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-arise/40 bg-arise/5 px-3 py-2.5 text-left transition hover:border-arise/70 active:scale-[0.99]"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-arise/15 text-arise">
              <UtensilsCrossed className="size-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink">{dishDraft?.items.length ? `Ajouter au plat en cours (${dishDraft.items.length})` : "Composer un plat avec"}</span>
              <span className="block text-[11px] text-ink-3">Combine plusieurs codes-barres, photos IA et aliments en un seul plat</span>
            </span>
          </button>
        )}

        {n && (
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              ["kcal", fmtInt(n.kcal), "var(--color-arise)"],
              ["Prot.", `${fmtDec(n.protein)} g`, "var(--color-protein)"],
              ["Gluc.", `${fmtDec(n.carbs)} g`, "var(--color-carbs)"],
              ["Lip.", `${fmtDec(n.fat)} g`, "var(--color-fat)"],
            ].map(([l, v, c]) => (
              <div key={l} className="rounded-xl border border-line bg-white/[0.02] px-1 py-2">
                <p className="font-display text-base font-semibold text-ink">{v}</p>
                <p className="flex items-center justify-center gap-1 text-[10px] text-ink-3">
                  <span className="size-1.5 rounded-full" style={{ background: c }} />
                  {l}
                </p>
              </div>
            ))}
          </div>
        )}

        {score && <ScorePanel s={score} />}

        <details className="group rounded-2xl border border-line bg-white/[0.02] p-4">
          <summary className="cursor-pointer list-none text-sm font-medium text-ink-2">
            Valeurs pour 100 {unit} <span className="text-ink-3 group-open:hidden">▸</span>
          </summary>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {(
              [
                ["Énergie", `${fmtInt(per100.kcal)} kcal`],
                ["Protéines", `${fmtDec(per100.protein)} g`],
                ["Glucides", `${fmtDec(per100.carbs)} g`],
                ["dont sucres", per100.sugar != null ? `${fmtDec(per100.sugar)} g` : "—"],
                ["Lipides", `${fmtDec(per100.fat)} g`],
                ["dont AGS", per100.satFat != null ? `${fmtDec(per100.satFat)} g` : "—"],
                ["Fibres", per100.fiber != null ? `${fmtDec(per100.fiber)} g` : "—"],
                ["Sel", per100.salt != null ? `${fmtDec(per100.salt)} g` : "—"],
                ["Transformation", food?.nova ? `NOVA ${food.nova}` : "—"],
                ["Densité", `${fmtDec(per100.kcal / 100)} kcal/g`],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-line/50 py-1">
                <dt className="text-ink-3">{k}</dt>
                <dd className="text-ink tabular">{v}</dd>
              </div>
            ))}
          </dl>
          {food?.micros?.length ? (
            <p className="mt-3 text-xs text-ink-3">
              Micronutriments notables : <span className="text-ink-2">{food.micros.join(", ")}</span>
            </p>
          ) : null}
          {food?.source === "off" && <p className="mt-2 text-[11px] text-ink-3">Source : Open Food Facts (base collaborative, vérifie l&apos;étiquette).</p>}
        </details>
      </div>
    </Sheet>
  );
}
