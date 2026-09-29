"use client";

import { Droplet, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { Button } from "@/components/ui/Button";
import { Chip, Field, NumberInput } from "@/components/ui/Fields";
import { ProgressBar } from "@/components/ui/Progress";
import { Sheet } from "@/components/ui/Sheet";
import { db } from "@/lib/db";
import { addWater, upsertDailyLog } from "@/lib/db/repos/body";
import { useDailyLog } from "@/lib/db/hooks";
import { cue } from "@/lib/system/feedback";
import { toast } from "@/lib/system/store";
import { closeSheet } from "@/lib/system/ui";
import { cn } from "@/lib/utils/cn";
import { relativeDayLabel, type DayKey } from "@/lib/utils/date";
import { fmtInt, fmtLiters, fmtSleep } from "@/lib/utils/format";

export function StepsSheet({ open, date }: { open: boolean; date: DayKey }) {
  const { profile } = useGame();
  const [steps, setSteps] = useState<number | undefined>();
  const target = profile?.targets.steps ?? 10000;

  useEffect(() => {
    if (!open) return;
    db.dailyLogs
      .where("date")
      .equals(date)
      .first()
      .then((l) => setSteps(l?.steps));
  }, [open, date]);

  const save = async () => {
    await upsertDailyLog(date, { steps: steps == null ? null : Math.round(steps) });
    toast({ tone: "success", title: "Pas enregistrés", message: `${fmtInt(steps ?? 0)} pas · ${relativeDayLabel(date)}` });
    closeSheet();
  };

  return (
    <Sheet open={open} onClose={closeSheet} title="Pas du jour" description={relativeDayLabel(date)} footer={<Button block size="lg" onClick={save}>Enregistrer</Button>}>
      <div className="space-y-4">
        <NumberInput value={steps} onChange={setSteps} step={500} min={0} max={100000} decimals={0} size="lg" ariaLabel="Nombre de pas" />
        <div>
          <div className="mb-1.5 flex justify-between text-xs text-ink-3">
            <span>Objectif</span>
            <span className="tabular">
              {fmtInt(steps ?? 0)} / {fmtInt(target)}
            </span>
          </div>
          <ProgressBar value={steps ?? 0} max={target} gradient label="Progression des pas" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[5000, 8000, 10000, 12000, 15000].map((v) => (
            <Chip key={v} active={steps === v} onClick={() => setSteps(v)}>
              {fmtInt(v)}
            </Chip>
          ))}
        </div>
        <p className="text-xs text-ink-3">Astuce : recopie le nombre affiché par ton téléphone ou ta montre. La synchronisation automatique (Apple Santé / Health Connect) est prévue.</p>
      </div>
    </Sheet>
  );
}

export function WaterSheet({ open, date }: { open: boolean; date: DayKey }) {
  const { profile } = useGame();
  const log = useDailyLog(date);
  const water = log?.waterMl ?? 0;
  const target = profile?.targets.waterMl ?? 2500;

  const add = async (ml: number) => {
    const next = await addWater(date, ml);
    cue("tap");
    if (next >= target && next - ml < target) toast({ tone: "quest", title: "Objectif d'hydratation atteint", message: `${fmtLiters(next)} L` });
  };

  const glasses = Math.round(target / 250);
  const filled = Math.floor(water / 250);

  return (
    <Sheet open={open} onClose={closeSheet} title="Hydratation" description={relativeDayLabel(date)}>
      <div className="space-y-5">
        <div className="text-center">
          <p className="font-display text-5xl font-bold text-ink">
            {fmtLiters(water)}
            <span className="ml-1 text-xl text-ink-3">/ {fmtLiters(target)} L</span>
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5" aria-hidden>
          {Array.from({ length: glasses }, (_, i) => (
            <motion.span
              key={i}
              initial={false}
              animate={{ scale: i < filled ? 1 : 0.85, opacity: i < filled ? 1 : 0.35 }}
              className={cn("flex size-8 items-center justify-center rounded-lg border", i < filled ? "border-cyan/50 bg-cyan/15 text-cyan" : "border-line text-ink-3")}
            >
              <Droplet className="size-4" />
            </motion.span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[250, 500, 750].map((ml) => (
            <Button key={ml} variant="secondary" size="lg" onClick={() => add(ml)}>
              +{ml} ml
            </Button>
          ))}
        </div>
        <div className="flex justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => add(-250)} disabled={water <= 0}>
            −250 ml
          </Button>
          <Button variant="ghost" size="sm" onClick={() => upsertDailyLog(date, { waterMl: 0 })} disabled={water <= 0}>
            <RotateCcw /> Remettre à zéro
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

export function SleepSheet({ open, date }: { open: boolean; date: DayKey }) {
  const { profile } = useGame();
  const [minutes, setMinutes] = useState(450);
  const [quality, setQuality] = useState<number | undefined>();
  const [energy, setEnergy] = useState<number | undefined>();

  useEffect(() => {
    if (!open) return;
    db.dailyLogs
      .where("date")
      .equals(date)
      .first()
      .then((l) => {
        setMinutes(l?.sleepMin ?? profile?.targets.sleepMin ?? 450);
        setQuality(l?.sleepQuality);
        setEnergy(l?.energy);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date]);

  const save = async () => {
    await upsertDailyLog(date, { sleepMin: minutes, sleepQuality: quality, energy });
    toast({ tone: "success", title: "Récupération enregistrée", message: `Sommeil ${fmtSleep(minutes)}` });
    closeSheet();
  };

  return (
    <Sheet open={open} onClose={closeSheet} title="Sommeil & énergie" description={`Nuit précédant ${relativeDayLabel(date).toLowerCase()}`} footer={<Button block size="lg" onClick={save}>Enregistrer</Button>}>
      <div className="space-y-6">
        <div>
          <p className="text-center font-display text-5xl font-bold text-ink">{fmtSleep(minutes)}</p>
          <input
            type="range"
            min={180}
            max={720}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            aria-label="Durée de sommeil"
            aria-valuetext={fmtSleep(minutes)}
            className="mt-4 w-full accent-[#8b5cf6]"
          />
          <div className="mt-1 flex justify-between text-[11px] text-ink-3">
            <span>3 h</span>
            <span>Objectif {fmtSleep(profile?.targets.sleepMin ?? 450)}</span>
            <span>12 h</span>
          </div>
        </div>
        <Field label="Qualité du sommeil">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((q) => (
              <Chip key={q} active={quality === q} onClick={() => setQuality(q)} className="flex-1 justify-center">
                {["😫", "😕", "😐", "🙂", "😴"][q - 1]} {q}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Énergie aujourd'hui (1–10)">
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
              <Chip key={v} active={energy === v} onClick={() => setEnergy(v)} className="justify-center">
                {v}
              </Chip>
            ))}
          </div>
        </Field>
      </div>
    </Sheet>
  );
}
