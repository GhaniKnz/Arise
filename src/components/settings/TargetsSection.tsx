"use client";

import { Crosshair, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { Button } from "@/components/ui/Button";
import { Field, NumberInput, Toggle } from "@/components/ui/Fields";
import { Notice } from "@/components/ui/Feedback";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { updateProfile } from "@/lib/db/repos/profile";
import type { QuestId, Targets } from "@/lib/db/types";
import { computeTargets } from "@/lib/domain/energy";
import { kcalFromMacros } from "@/lib/domain/nutrition";
import { QUEST_DEFS, ALL_QUESTS } from "@/lib/domain/game";
import { toast } from "@/lib/system/store";
import { fmtInt } from "@/lib/utils/format";

const FIELDS: { key: keyof Targets; label: string; unit: string; step: number; min: number; max: number }[] = [
  { key: "kcal", label: "Calories", unit: "kcal", step: 50, min: 1000, max: 6000 },
  { key: "protein", label: "Protéines", unit: "g", step: 5, min: 30, max: 400 },
  { key: "carbs", label: "Glucides", unit: "g", step: 5, min: 20, max: 800 },
  { key: "fat", label: "Lipides", unit: "g", step: 5, min: 20, max: 300 },
  { key: "fiber", label: "Fibres", unit: "g", step: 1, min: 10, max: 80 },
  { key: "waterMl", label: "Eau", unit: "ml", step: 250, min: 1000, max: 6000 },
  { key: "steps", label: "Pas", unit: "pas", step: 500, min: 2000, max: 40000 },
  { key: "sleepMin", label: "Sommeil", unit: "min", step: 15, min: 300, max: 660 },
];

export function TargetsSection() {
  const { profile, currentWeight, adaptive } = useGame();
  const [t, setT] = useState<Targets | null>(null);
  const [source, setSource] = useState<Targets | null>(null);
  if (profile && profile.targets !== source) {
    setSource(profile.targets);
    setT(profile.targets);
  }
  if (!profile || !t) return null;

  const macroKcal = kcalFromMacros(t);
  const mismatch = Math.abs(macroKcal - t.kcal) > t.kcal * 0.08;

  const recompute = async () => {
    const r = computeTargets({
      sex: profile.sex,
      age: new Date().getFullYear() - profile.birthYear,
      heightCm: profile.heightCm,
      weightKg: currentWeight ?? profile.startWeightKg,
      activity: profile.activity,
      goal: profile.goal,
      weeklyRatePct: profile.weeklyRatePct,
      targetWeightKg: profile.targetWeightKg,
      adaptiveTdee: adaptive?.confidence === "high" ? adaptive.tdee : undefined,
    });
    const next = { ...t, kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, fiber: r.fiber };
    setT(next);
    await updateProfile({ targets: next, targetsMode: "auto" });
    toast({ tone: "success", title: "Objectifs recalculés", message: `${fmtInt(r.kcal)} kcal · ${r.protein} g protéines${adaptive?.confidence === "high" ? " (maintenance adaptative)" : ""}` });
  };

  const save = async () => {
    await updateProfile({ targets: t, targetsMode: "manual" });
    toast({ tone: "success", title: "Objectifs enregistrés" });
  };

  const toggleQuest = async (id: QuestId, on: boolean) => {
    const next = on ? ALL_QUESTS.filter((q) => q === id || profile.quests.includes(q)) : profile.quests.filter((q) => q !== id);
    await updateProfile({ quests: next });
  };

  return (
    <>
      <Panel id="targets">
        <PanelHeader title="Objectifs quotidiens" icon={<Crosshair />} subtitle={profile.targetsMode === "auto" ? "Mode automatique : recalculés avec ton poids" : "Mode manuel"} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <NumberInput value={t[f.key]} onChange={(v) => setT({ ...t, [f.key]: Math.round(v ?? 0) })} step={f.step} min={f.min} max={f.max} unit={f.unit} decimals={0} stepper={false} />
            </Field>
          ))}
        </div>
        {mismatch && <Notice tone="warn" className="mt-3">Tes macros totalisent {fmtInt(macroKcal)} kcal pour un objectif de {fmtInt(t.kcal)} kcal.</Notice>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={save}>Enregistrer</Button>
          <Button variant="secondary" onClick={recompute}>
            <RefreshCw /> Recalculer automatiquement
          </Button>
        </div>
      </Panel>

      <Panel id="quests">
        <PanelHeader title="Quêtes quotidiennes" subtitle="Choisis ce que tu veux suivre : le score du jour s'adapte" />
        <div className="divide-y divide-line/60">
          {ALL_QUESTS.map((id) => (
            <Toggle key={id} checked={profile.quests.includes(id)} onChange={(v) => toggleQuest(id, v)} label={QUEST_DEFS[id].label} description={`+${QUEST_DEFS[id].xp} XP · stat ${QUEST_DEFS[id].stat}`} />
          ))}
        </div>
      </Panel>
    </>
  );
}
