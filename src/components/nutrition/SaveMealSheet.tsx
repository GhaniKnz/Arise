"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Fields";
import { Sheet } from "@/components/ui/Sheet";
import { entriesToIngredients, saveMeal } from "@/lib/db/repos/nutrition";
import type { FoodEntry, MealSlot } from "@/lib/db/types";
import { MEAL_LABEL, totalsOf } from "@/lib/domain/nutrition";
import { toast } from "@/lib/system/store";
import { fmtInt } from "@/lib/utils/format";
import { useResetOnOpen } from "@/lib/hooks/useResetOnOpen";

export function SaveMealSheet({ open, onClose, entries, slot }: { open: boolean; onClose: () => void; entries: FoodEntry[]; slot: MealSlot }) {
  const [name, setName] = useState("");
  useResetOnOpen(open, () => setName(`${MEAL_LABEL[slot]} habituel`), slot);
  const items = entriesToIngredients(entries);
  const t = totalsOf(entries);

  const save = async () => {
    if (!name.trim() || !items.length) return;
    await saveMeal({ name: name.trim(), items, defaultSlot: slot });
    toast({ tone: "success", title: "Repas enregistré", message: `${name} · ajout en un clic depuis « Repas »` });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Enregistrer comme repas"
      description={`${items.length} aliments · ${fmtInt(t.kcal)} kcal`}
      footer={
        <Button block size="lg" onClick={save} disabled={!name.trim() || !items.length}>
          Enregistrer
        </Button>
      }
    >
      <div className="space-y-3">
        <Field label="Nom du repas">
          <TextInput data-autofocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </Field>
        <ul className="space-y-1 text-sm text-ink-2">
          {items.map((it, i) => (
            <li key={i} className="flex justify-between">
              <span className="truncate">{it.name}</span>
              <span className="text-ink-3 tabular">{fmtInt(it.grams)} g</span>
            </li>
          ))}
        </ul>
        {items.length < entries.length && <p className="text-xs text-ink-3">Les ajouts rapides (sans aliment) ne sont pas inclus.</p>}
      </div>
    </Sheet>
  );
}
