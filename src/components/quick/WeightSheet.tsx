"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { Button } from "@/components/ui/Button";
import { Field, NumberInput } from "@/components/ui/Fields";
import { Notice } from "@/components/ui/Feedback";
import { Sheet } from "@/components/ui/Sheet";
import { db } from "@/lib/db";
import { upsertMetrics } from "@/lib/db/repos/body";
import { refreshAutoTargets } from "@/lib/db/repos/profile";
import type { BodyMetric } from "@/lib/db/types";
import { toast } from "@/lib/system/store";
import { closeSheet } from "@/lib/system/ui";
import { cn } from "@/lib/utils/cn";
import { relativeDayLabel, type DayKey } from "@/lib/utils/date";

type Extra = Pick<BodyMetric, "bodyFatPct" | "muscleKg" | "waterPct" | "visceral" | "waistCm" | "chestCm" | "armCm" | "thighCm" | "hipsCm" | "neckCm">;

const EXTRA_FIELDS: { key: keyof Extra; label: string; unit: string; step: number }[] = [
  { key: "waistCm", label: "Tour de taille", unit: "cm", step: 0.5 },
  { key: "bodyFatPct", label: "Masse grasse", unit: "%", step: 0.1 },
  { key: "muscleKg", label: "Masse musculaire", unit: "kg", step: 0.1 },
  { key: "waterPct", label: "Eau corporelle", unit: "%", step: 0.1 },
  { key: "visceral", label: "Graisse viscérale", unit: "", step: 1 },
  { key: "chestCm", label: "Tour de poitrine", unit: "cm", step: 0.5 },
  { key: "armCm", label: "Tour de bras", unit: "cm", step: 0.5 },
  { key: "thighCm", label: "Tour de cuisse", unit: "cm", step: 0.5 },
  { key: "hipsCm", label: "Tour de hanches", unit: "cm", step: 0.5 },
  { key: "neckCm", label: "Tour de cou", unit: "cm", step: 0.5 },
];

export function WeightSheet({ open, date }: { open: boolean; date: DayKey }) {
  const { currentWeight } = useGame();
  const [weight, setWeight] = useState<number | undefined>(undefined);
  const [extra, setExtra] = useState<Partial<Extra>>({});
  const [showMore, setShowMore] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    db.bodyMetrics
      .where("date")
      .equals(date)
      .first()
      .then((m) => {
        if (cancelled) return;
        setWeight(m?.weightKg ?? currentWeight ?? undefined);
        const e: Partial<Extra> = {};
        for (const f of EXTRA_FIELDS) if (m?.[f.key] != null) e[f.key] = m[f.key];
        setExtra(e);
        setShowMore(Object.keys(e).length > 0);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date]);

  const save = async () => {
    if (weight == null || weight < 25 || weight > 350) {
      toast({ tone: "error", title: "Poids invalide", message: "Entre une valeur entre 25 et 350 kg." });
      return;
    }
    setSaving(true);
    try {
      await upsertMetrics(date, { weightKg: weight, ...extra });
      await refreshAutoTargets(weight);
      toast({ tone: "success", title: "Pesée enregistrée", message: `${weight.toLocaleString("fr-FR")} kg · ${relativeDayLabel(date)}`, xp: 20 });
      closeSheet();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={closeSheet}
      title="Pesée"
      description={relativeDayLabel(date)}
      footer={
        <Button block size="lg" onClick={save} disabled={saving}>
          Enregistrer
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Poids" htmlFor="w-input">
          <NumberInput id="w-input" value={weight} onChange={setWeight} step={0.1} unit="kg" size="lg" min={25} max={350} />
        </Field>
        <p className="text-xs text-ink-3">Idéalement le matin, à jeun, après être allé aux toilettes. ARISE lisse les variations avec une moyenne sur 7 jours.</p>

        <button type="button" onClick={() => setShowMore((s) => !s)} className="flex w-full items-center justify-between rounded-xl border border-line bg-deep/50 px-3 py-2.5 text-sm text-ink-2" aria-expanded={showMore}>
          Mesures & composition (optionnel)
          <ChevronDown className={cn("size-4 transition", showMore && "rotate-180")} />
        </button>
        {showMore && (
          <div className="space-y-3">
            <Notice>Les valeurs des balances à impédance sont des estimations, sensibles à l&apos;hydratation.</Notice>
            <div className="grid grid-cols-2 gap-3">
              {EXTRA_FIELDS.map((f) => (
                <Field key={f.key} label={f.label} htmlFor={`x-${f.key}`}>
                  <NumberInput id={`x-${f.key}`} value={extra[f.key]} onChange={(v) => setExtra((e) => ({ ...e, [f.key]: v }))} step={f.step} unit={f.unit} stepper={false} />
                </Field>
              ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
