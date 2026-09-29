"use client";

import { useEffect, useMemo, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { Button } from "@/components/ui/Button";
import { Chip, Field, NumberInput, TextInput } from "@/components/ui/Fields";
import { Sheet } from "@/components/ui/Sheet";
import { logCardio } from "@/lib/db/repos/workout";
import type { CardioType } from "@/lib/db/types";
import { cardioKcal } from "@/lib/domain/energy";
import { toast } from "@/lib/system/store";
import { closeSheet } from "@/lib/system/ui";
import { relativeDayLabel, type DayKey } from "@/lib/utils/date";

export const CARDIO_LABEL: Record<CardioType, string> = {
  walk: "Marche",
  incline_walk: "Tapis incliné",
  run: "Course",
  bike: "Vélo",
  rower: "Rameur",
  elliptical: "Elliptique",
  stairs: "Escaliers",
  swim: "Natation",
  hiit: "HIIT",
  sport: "Sport collectif",
  other: "Autre",
};

const SPEED_TYPES: CardioType[] = ["walk", "incline_walk", "run", "bike"];

export function CardioSheet({ open, date }: { open: boolean; date: DayKey }) {
  const { currentWeight } = useGame();
  const [type, setType] = useState<CardioType>("incline_walk");
  const [duration, setDuration] = useState<number | undefined>(30);
  const [speed, setSpeed] = useState<number | undefined>(5.5);
  const [incline, setIncline] = useState<number | undefined>(10);
  const [distance, setDistance] = useState<number | undefined>();
  const [hr, setHr] = useState<number | undefined>();
  const [kcal, setKcal] = useState<number | undefined>();
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setKcal(undefined);
      setNotes("");
    }
  }, [open]);

  const estimate = useMemo(
    () => (duration ? cardioKcal(type, duration, currentWeight ?? 75, type === "incline_walk" || type === "walk" ? incline : undefined, speed) : 0),
    [type, duration, currentWeight, incline, speed],
  );

  const save = async () => {
    if (!duration || duration <= 0) {
      toast({ tone: "error", title: "Durée requise" });
      return;
    }
    await logCardio({
      date,
      type,
      durationMin: duration,
      speedKmh: SPEED_TYPES.includes(type) ? speed : undefined,
      inclinePct: type === "incline_walk" ? incline : undefined,
      distanceKm: distance ?? (speed && SPEED_TYPES.includes(type) ? Math.round(((speed * duration) / 60) * 100) / 100 : undefined),
      avgHr: hr,
      kcal: kcal ?? estimate,
      notes: notes || undefined,
    });
    toast({ tone: "success", title: "Cardio enregistré", message: `${CARDIO_LABEL[type]} · ${duration} min`, xp: duration >= 15 ? 60 : undefined });
    closeSheet();
  };

  return (
    <Sheet open={open} onClose={closeSheet} title="Cardio" description={relativeDayLabel(date)} footer={<Button block size="lg" onClick={save}>Enregistrer</Button>}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CARDIO_LABEL) as CardioType[]).map((t) => (
            <Chip key={t} active={type === t} onClick={() => setType(t)}>
              {CARDIO_LABEL[t]}
            </Chip>
          ))}
        </div>
        <Field label="Durée">
          <NumberInput value={duration} onChange={setDuration} step={5} min={1} max={600} unit="min" decimals={0} />
        </Field>
        {SPEED_TYPES.includes(type) && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vitesse">
              <NumberInput value={speed} onChange={setSpeed} step={0.5} min={0} max={40} unit="km/h" stepper={false} />
            </Field>
            {type === "incline_walk" ? (
              <Field label="Inclinaison">
                <NumberInput value={incline} onChange={setIncline} step={1} min={0} max={20} unit="%" stepper={false} decimals={0} />
              </Field>
            ) : (
              <Field label="Distance">
                <NumberInput value={distance} onChange={setDistance} step={0.1} min={0} max={300} unit="km" stepper={false} decimals={2} />
              </Field>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="FC moyenne" hint="Si disponible">
            <NumberInput value={hr} onChange={setHr} step={1} min={40} max={220} unit="bpm" stepper={false} decimals={0} />
          </Field>
          <Field label="Calories" hint={`Estimation : ~${estimate} kcal`}>
            <NumberInput value={kcal} onChange={setKcal} placeholder={String(estimate)} step={10} min={0} max={3000} unit="kcal" stepper={false} decimals={0} />
          </Field>
        </div>
        <Field label="Note">
          <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex. zone 2, fractionné…" />
        </Field>
      </div>
    </Sheet>
  );
}
