"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip, Field, NumberInput } from "@/components/ui/Fields";
import { Sheet } from "@/components/ui/Sheet";
import { CATEGORY_META } from "@/lib/data/foods";
import { ensureFoodCached } from "@/lib/db/repos/nutrition";
import { foodPart, type DishPart } from "@/lib/db/repos/dishDraft";
import type { FoodItem } from "@/lib/db/types";
import { scaleNutrients } from "@/lib/domain/nutrition";
import { useResetOnOpen } from "@/lib/hooks/useResetOnOpen";
import { cue } from "@/lib/system/feedback";
import { toast } from "@/lib/system/store";
import { fmtDec, fmtInt } from "@/lib/utils/format";
import { BarcodeScanner } from "./BarcodeScanner";

/** Scan products one after another; each one is added to the dish with its quantity. */
export function DishBarcodeSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (part: DishPart) => void }) {
  const [food, setFood] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState<number | undefined>(100);
  const [count, setCount] = useState(0);

  useResetOnOpen(open, () => {
    setFood(null);
    setCount(0);
  });

  const found = (f: FoodItem) => {
    setFood(f);
    setGrams(f.defaultGrams || 100);
  };

  const add = () => {
    if (!food || !grams || grams <= 0) return;
    if (food.source !== "builtin") void ensureFoodCached(food);
    onAdd(foodPart(food, grams, "barcode"));
    cue("set");
    toast({ tone: "success", title: `${food.name} ajouté au plat`, message: `${fmtInt((food.kcal * grams) / 100)} kcal · scanne le suivant` });
    setCount((n) => n + 1);
    setFood(null);
  };

  const unit = food?.unit ?? "g";
  const n = food ? scaleNutrients(food, grams ?? 0) : null;
  const portions = food?.portions ?? [];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="md"
      title={food ? food.name : "Scanner un produit"}
      description={food ? [food.brand, `${fmtInt(food.kcal)} kcal / 100 ${unit}`].filter(Boolean).join(" · ") : count ? `${count} produit(s) ajouté(s) · scanne le suivant` : "Ajoute autant de produits que tu veux"}
      footer={
        food ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="lg" onClick={() => setFood(null)}>
              Annuler
            </Button>
            <Button block size="lg" onClick={add} disabled={!grams}>
              <Plus /> Ajouter au plat · {fmtInt(n?.kcal ?? 0)} kcal
            </Button>
          </div>
        ) : (
          <Button block size="lg" variant={count ? "primary" : "secondary"} onClick={onClose}>
            {count ? (
              <>
                <Check /> Terminé ({count})
              </>
            ) : (
              "Fermer"
            )}
          </Button>
        )
      }
    >
      {food ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {food.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={food.image} alt="" className="size-16 shrink-0 rounded-xl bg-white object-contain" />
            ) : (
              <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-3xl" aria-hidden>
                {CATEGORY_META[food.category].emoji}
              </span>
            )}
            <p className="text-sm text-ink-2">Quelle quantité de ce produit dans ton plat ?</p>
          </div>
          <Field label={`Quantité (${unit})`}>
            <NumberInput value={grams} onChange={setGrams} step={unit === "ml" ? 50 : 10} min={0} max={5000} unit={unit} size="lg" decimals={0} />
          </Field>
          <div className="flex flex-wrap gap-2">
            {portions.map((p) => (
              <Chip key={p.label} active={grams === p.grams} onClick={() => setGrams(p.grams)}>
                {p.label} · {p.grams} {unit}
              </Chip>
            ))}
            {[50, 100, 150, 200, 250].filter((g) => !portions.some((p) => p.grams === g)).map((g) => (
              <Chip key={g} active={grams === g} onClick={() => setGrams(g)}>
                {g} {unit}
              </Chip>
            ))}
          </div>
          {n && (
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ["kcal", fmtInt(n.kcal)],
                ["Prot.", `${fmtDec(n.protein)} g`],
                ["Gluc.", `${fmtDec(n.carbs)} g`],
                ["Lip.", `${fmtDec(n.fat)} g`],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl border border-line bg-white/[0.02] py-2">
                  <p className="font-display font-semibold text-ink">{v}</p>
                  <p className="text-[10px] text-ink-3">{l}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <BarcodeScanner active={open && !food} onFood={found} />
      )}
    </Sheet>
  );
}
