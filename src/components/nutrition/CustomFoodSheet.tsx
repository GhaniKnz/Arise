"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, NumberInput, Segmented, Select, TextInput } from "@/components/ui/Fields";
import { Notice } from "@/components/ui/Feedback";
import { Sheet } from "@/components/ui/Sheet";
import { CATEGORY_META } from "@/lib/data/foods";
import { db } from "@/lib/db";
import { saveCustomFood } from "@/lib/db/repos/nutrition";
import type { FoodCategory, FoodItem, Nova } from "@/lib/db/types";
import { kcalFromMacros } from "@/lib/domain/nutrition";
import { toast } from "@/lib/system/store";
import { fmtInt } from "@/lib/utils/format";
import { useResetOnOpen } from "@/lib/hooks/useResetOnOpen";

type Draft = {
  name: string;
  brand: string;
  category: FoodCategory;
  unit: "g" | "ml";
  kcal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  satFat?: number;
  salt?: number;
  defaultGrams?: number;
  nova?: Nova;
  barcode?: string;
};

const EMPTY: Draft = { name: "", brand: "", category: "other", unit: "g", defaultGrams: 100 };

export function CustomFoodSheet({
  open,
  onClose,
  food,
  onSaved,
  onDelete,
  barcode,
}: {
  open: boolean;
  onClose: () => void;
  food?: FoodItem | null;
  onSaved?: (f: FoodItem) => void;
  onDelete?: () => void;
  barcode?: string;
}) {
  const [d, setD] = useState<Draft>(EMPTY);
  useResetOnOpen(
    open,
    () =>
      setD(
        food
          ? { name: food.name, brand: food.brand ?? "", category: food.category, unit: food.unit ?? "g", kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat, fiber: food.fiber, sugar: food.sugar, satFat: food.satFat, salt: food.salt, defaultGrams: food.defaultGrams, nova: food.nova, barcode: food.barcode }
          : { ...EMPTY, barcode },
      ),
    food?.id ?? barcode,
  );

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((s) => ({ ...s, [k]: v }));
  const atwater = kcalFromMacros({ protein: d.protein ?? 0, carbs: d.carbs ?? 0, fat: d.fat ?? 0 });
  const mismatch = d.kcal != null && atwater > 0 && Math.abs(atwater - d.kcal) / d.kcal > 0.2;

  const save = async () => {
    if (!d.name.trim() || d.kcal == null || d.protein == null || d.carbs == null || d.fat == null) {
      toast({ tone: "error", title: "Champs requis", message: "Nom, calories, protéines, glucides et lipides." });
      return;
    }
    const payload = {
      id: food?.source === "custom" || food?.source === "ai" ? food.id : undefined,
      name: d.name.trim(),
      brand: d.brand.trim() || undefined,
      category: d.category,
      unit: d.unit,
      kcal: d.kcal,
      protein: d.protein,
      carbs: d.carbs,
      fat: d.fat,
      fiber: d.fiber,
      sugar: d.sugar,
      satFat: d.satFat,
      salt: d.salt,
      nova: d.nova,
      barcode: d.barcode,
      defaultGrams: d.defaultGrams ?? 100,
      portions: d.defaultGrams && d.defaultGrams !== 100 ? [{ label: "1 portion", grams: d.defaultGrams }] : undefined,
    };
    const id = await saveCustomFood(payload);
    const saved = (await db.foods.get(id)) as FoodItem | undefined;
    toast({ tone: "success", title: food ? "Aliment modifié" : "Aliment créé", message: d.name });
    if (saved) onSaved?.(saved);
    onClose();
  };

  const n = (k: "kcal" | "protein" | "carbs" | "fat" | "fiber" | "sugar" | "satFat" | "salt", label: string, unit: string) => (
    <Field label={label}>
      <NumberInput value={d[k]} onChange={(v) => set(k, v)} stepper={false} unit={unit} min={0} max={k === "kcal" ? 950 : 100} />
    </Field>
  );

  return (
    <Sheet open={open} onClose={onClose} size="lg" title={food ? "Modifier l'aliment" : "Créer un aliment"} description={`Valeurs pour 100 ${d.unit}, comme sur l'étiquette`} footer={
        <div className="flex gap-2">
          {onDelete && (
            <Button variant="danger" size="lg" onClick={onDelete}>
              Supprimer
            </Button>
          )}
          <Button block size="lg" onClick={save}>
            Enregistrer
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nom">
            <TextInput data-autofocus value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex. Galettes de sarrasin" />
          </Field>
          <Field label="Marque (optionnel)">
            <TextInput value={d.brand} onChange={(e) => set("brand", e.target.value)} />
          </Field>
          <Field label="Catégorie">
            <Select value={d.category} onChange={(e) => set("category", e.target.value as FoodCategory)}>
              {(Object.keys(CATEGORY_META) as FoodCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Unité">
            <Segmented value={d.unit} onChange={(v) => set("unit", v)} options={[{ value: "g", label: "Grammes" }, { value: "ml", label: "Millilitres" }]} ariaLabel="Unité" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {n("kcal", "Calories", "kcal")}
          {n("protein", "Protéines", "g")}
          {n("carbs", "Glucides", "g")}
          {n("fat", "Lipides", "g")}
          {n("fiber", "Fibres", "g")}
          {n("sugar", "Sucres", "g")}
          {n("satFat", "Gras saturés", "g")}
          {n("salt", "Sel", "g")}
        </div>
        {mismatch && <Notice tone="warn">Les macros donnent ~{fmtInt(atwater)} kcal : vérifie les valeurs saisies.</Notice>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Portion habituelle">
            <NumberInput value={d.defaultGrams} onChange={(v) => set("defaultGrams", v)} unit={d.unit} min={1} max={2000} decimals={0} step={10} />
          </Field>
          <Field label="Niveau de transformation" hint="1 = brut · 4 = ultra-transformé">
            <Segmented
              value={String(d.nova ?? 0) as "0" | "1" | "2" | "3" | "4"}
              onChange={(v) => set("nova", v === "0" ? undefined : (Number(v) as Nova))}
              size="sm"
              options={[
                { value: "0", label: "?" },
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
                { value: "4", label: "4" },
              ]}
              ariaLabel="NOVA"
            />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}
