"use client";

import { UserRound } from "lucide-react";
import { useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { Button } from "@/components/ui/Button";
import { Field, NumberInput, Segmented, Select, TextInput } from "@/components/ui/Fields";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { refreshAutoTargets, updateProfile } from "@/lib/db/repos/profile";
import type { ActivityLevel, Experience, GoalType, Profile, Sex } from "@/lib/db/types";
import { ACTIVITY_LABELS, GOAL_LABELS } from "@/lib/domain/energy";
import { toast } from "@/lib/system/store";
import { fmtDec } from "@/lib/utils/format";

type Draft = Pick<Profile, "name" | "sex" | "heightCm" | "startWeightKg" | "targetWeightKg" | "goal" | "activity" | "experience" | "weeklyRatePct"> & { age: number };

export function ProfileSection() {
  const { profile, currentWeight } = useGame();
  const [d, setD] = useState<Draft | null>(null);

  if (profile && !d)
    setD({
        name: profile.name,
        sex: profile.sex,
        age: new Date().getFullYear() - profile.birthYear,
        heightCm: profile.heightCm,
        startWeightKg: profile.startWeightKg,
        targetWeightKg: profile.targetWeightKg,
        goal: profile.goal,
        activity: profile.activity,
        experience: profile.experience,
        weeklyRatePct: profile.weeklyRatePct,
    });

  if (!profile || !d) return null;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((s) => (s ? { ...s, [k]: v } : s));

  const save = async () => {
    if (!d.name.trim() || d.age < 14 || d.heightCm < 120 || d.targetWeightKg < 30) {
      toast({ tone: "error", title: "Vérifie les champs du profil" });
      return;
    }
    const { age, ...rest } = d;
    await updateProfile({ ...rest, name: d.name.trim(), birthYear: new Date().getFullYear() - age });
    await refreshAutoTargets(currentWeight ?? d.startWeightKg);
    toast({ tone: "success", title: "Profil mis à jour", message: profile.targetsMode === "auto" ? "Objectifs recalculés" : undefined });
  };

  return (
    <Panel id="profile">
      <PanelHeader title="Profil & objectif" icon={<UserRound />} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Prénom">
          <TextInput value={d.name} onChange={(e) => set("name", e.target.value)} maxLength={30} />
        </Field>
        <Field label="Sexe">
          <Segmented value={d.sex} onChange={(v: Sex) => set("sex", v)} options={[{ value: "male", label: "Homme" }, { value: "female", label: "Femme" }]} ariaLabel="Sexe" />
        </Field>
        <Field label="Âge">
          <NumberInput value={d.age} onChange={(v) => set("age", Math.round(v ?? 0))} min={14} max={100} unit="ans" decimals={0} stepper={false} />
        </Field>
        <Field label="Taille">
          <NumberInput value={d.heightCm} onChange={(v) => set("heightCm", Math.round(v ?? 0))} min={120} max={230} unit="cm" decimals={0} stepper={false} />
        </Field>
        <Field label="Poids de départ">
          <NumberInput value={d.startWeightKg} onChange={(v) => set("startWeightKg", v ?? 0)} step={0.1} min={30} max={300} unit="kg" stepper={false} />
        </Field>
        <Field label="Poids objectif">
          <NumberInput value={d.targetWeightKg} onChange={(v) => set("targetWeightKg", v ?? 0)} step={0.5} min={30} max={300} unit="kg" stepper={false} />
        </Field>
        <Field label="Objectif" className="sm:col-span-2">
          <Select value={d.goal} onChange={(e) => set("goal", e.target.value as GoalType)}>
            {(Object.keys(GOAL_LABELS) as GoalType[]).map((g) => (
              <option key={g} value={g}>
                {GOAL_LABELS[g].label} — {GOAL_LABELS[g].hint}
              </option>
            ))}
          </Select>
        </Field>
        {d.goal !== "maintain" && (
          <Field label={`Rythme visé : ${fmtDec(d.weeklyRatePct)} % du poids / semaine`} hint={d.goal === "cut" ? "Recommandé : 0,5–0,7 % (au-delà de 1 %, risque accru de perte musculaire)." : "Prise de masse : 0,1–0,25 %/semaine limite le gain de gras."} className="sm:col-span-2">
            <input
              type="range"
              min={d.goal === "cut" ? 0.25 : 0.05}
              max={d.goal === "cut" ? 1 : 0.5}
              step={0.05}
              value={d.weeklyRatePct}
              onChange={(e) => set("weeklyRatePct", Number(e.target.value))}
              className="w-full accent-[#4da3ff]"
              aria-label="Rythme hebdomadaire"
            />
          </Field>
        )}
        <Field label="Activité quotidienne">
          <Select value={d.activity} onChange={(e) => set("activity", e.target.value as ActivityLevel)}>
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
              <option key={a} value={a}>
                {ACTIVITY_LABELS[a].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Expérience">
          <Select value={d.experience} onChange={(e) => set("experience", e.target.value as Experience)}>
            <option value="beginner">Débutant</option>
            <option value="intermediate">Intermédiaire</option>
            <option value="advanced">Avancé</option>
          </Select>
        </Field>
      </div>
      <Button className="mt-4" onClick={save}>
        Enregistrer le profil
      </Button>
    </Panel>
  );
}
