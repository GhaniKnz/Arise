"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { Field, NumberInput, Segmented, TextInput } from "@/components/ui/Fields";
import { Sheet } from "@/components/ui/Sheet";
import { db } from "@/lib/db";
import { patch } from "@/lib/db/repo";
import { deleteEntries, quickAdd } from "@/lib/db/repos/nutrition";
import type { FoodEntry, MealSlot } from "@/lib/db/types";
import { kcalFromMacros, MEAL_SLOTS } from "@/lib/domain/nutrition";
import { toast } from "@/lib/system/store";
import type { DayKey } from "@/lib/utils/date";
import { fmtInt } from "@/lib/utils/format";

/** Add calories without a food (restaurant, estimate) — or edit such an entry. */
export function QuickAddSheet({ open, onClose, date, meal: initialMeal, entry }: { open: boolean; onClose: () => void; date: DayKey; meal: MealSlot; entry?: FoodEntry | null }) {
  const [name, setName] = useState("");
  const [meal, setMeal] = useState<MealSlot>(initialMeal);
  const [kcal, setKcal] = useState<number | undefined>();
  const [p, setP] = useState<number | undefined>();
  const [c, setC] = useState<number | undefined>();
  const [f, setF] = useState<number | undefined>();

  useEffect(() => {
    if (!open) return;
    setName(entry?.name ?? "");
    setMeal(entry?.meal ?? initialMeal);
    setKcal(entry?.kcal);
    setP(entry?.protein || undefined);
    setC(entry?.carbs || undefined);
    setF(entry?.fat || undefined);
  }, [open, entry, initialMeal]);

  const fromMacros = kcalFromMacros({ protein: p ?? 0, carbs: c ?? 0, fat: f ?? 0 });
  const effectiveKcal = kcal ?? (fromMacros > 0 ? Math.round(fromMacros) : undefined);

  const save = async () => {
    if (!effectiveKcal || effectiveKcal <= 0) {
      toast({ tone: "error", title: "Indique au moins les calories" });
      return;
    }
    if (entry) {
      await patch(db.foodEntries, entry.id, { name: name || "Ajout rapide", meal, kcal: Math.round(effectiveKcal), protein: p ?? 0, carbs: c ?? 0, fat: f ?? 0 });
    } else {
      await quickAdd({ date, meal, name, kcal: effectiveKcal, protein: p, carbs: c, fat: f });
    }
    toast({ tone: "success", title: entry ? "Entrée modifiée" : "Ajout rapide enregistré", message: `${fmtInt(effectiveKcal)} kcal` });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={entry ? "Modifier l'ajout rapide" : "Ajout rapide"}
      description="Pour un repas estimé (restaurant, fait maison…)"
      footer={
        <div className="flex gap-2">
          {entry && (
            <IconButton
              label="Supprimer"
              variant="secondary"
              size="lg"
              className="text-bad"
              onClick={async () => {
                await deleteEntries([entry.id]);
                onClose();
              }}
            >
              <Trash2 />
            </IconButton>
          )}
          <Button block size="lg" onClick={save}>
            Enregistrer
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Nom (optionnel)">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Burger restaurant" />
        </Field>
        <Segmented value={meal} onChange={setMeal} size="sm" ariaLabel="Repas" options={MEAL_SLOTS.map((m) => ({ value: m.id, label: m.label.replace("Petit-déjeuner", "Petit-déj.") }))} />
        <Field label="Calories" hint={kcal == null && fromMacros > 0 ? `Calculé depuis les macros : ${fmtInt(fromMacros)} kcal` : undefined}>
          <NumberInput value={kcal} onChange={setKcal} step={10} min={0} max={5000} unit="kcal" size="lg" decimals={0} />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Protéines">
            <NumberInput value={p} onChange={setP} stepper={false} unit="g" min={0} max={500} />
          </Field>
          <Field label="Glucides">
            <NumberInput value={c} onChange={setC} stepper={false} unit="g" min={0} max={800} />
          </Field>
          <Field label="Lipides">
            <NumberInput value={f} onChange={setF} stepper={false} unit="g" min={0} max={400} />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}
