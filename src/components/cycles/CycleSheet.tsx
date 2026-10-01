"use client";

import { Flame, Scale, Sprout, Trash2, Shuffle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { Button } from "@/components/ui/Button";
import { ChoiceCard, Field, NumberInput, TextArea, TextInput } from "@/components/ui/Fields";
import { Notice } from "@/components/ui/Feedback";
import { Sheet } from "@/components/ui/Sheet";
import { addPastCycle, deleteCycle, switchCycle, updateCycle } from "@/lib/db/repos/cycles";
import type { GoalType } from "@/lib/db/types";
import { CYCLE_META, type CycleSpan } from "@/lib/domain/cycles";
import { computeTargets, defaultWeeklyRatePct, GOAL_LABELS } from "@/lib/domain/energy";
import { useResetOnOpen } from "@/lib/hooks/useResetOnOpen";
import { cue } from "@/lib/system/feedback";
import { toast } from "@/lib/system/store";
import { addDays, formatShort } from "@/lib/utils/date";
import { fmtDec, fmtInt, round } from "@/lib/utils/format";

export type CycleSheetMode = { kind: "switch" } | { kind: "past" } | { kind: "edit"; span: CycleSpan };

const GOALS: GoalType[] = ["cut", "bulk", "maintain", "recomp"];
const GOAL_ICON: Record<GoalType, ReactNode> = { cut: <Flame />, bulk: <Sprout />, maintain: <Scale />, recomp: <Shuffle /> };

/** Suggested target weight when starting a cycle from the current weight. */
function suggestTarget(goal: GoalType, current: number) {
  if (goal === "cut") return round(current * 0.93, 0.5);
  if (goal === "bulk") return round(current * 1.04, 0.5);
  return round(current, 0.5);
}

export function CycleSheet({ mode, onClose }: { mode: CycleSheetMode | null; onClose: () => void }) {
  const { profile, cycles, currentWeight, adaptive, today } = useGame();
  const running = cycles.at(-1);
  const weight = currentWeight ?? profile?.startWeightKg ?? 70;

  const [goal, setGoal] = useState<GoalType>("bulk");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [target, setTarget] = useState(weight);
  const [rate, setRate] = useState(0.2);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useResetOnOpen(mode != null, () => {
    setConfirmDelete(false);
    if (mode?.kind === "edit") {
      const s = mode.span;
      setGoal(s.goal);
      setStart(s.start);
      setEnd(s.end);
      setTarget(s.targetWeightKg ?? weight);
      setName(s.row?.name ?? "");
      setNote(s.note ?? "");
      return;
    }
    const next = mode?.kind === "switch" ? (GOALS.find((g) => g !== running?.goal && g !== "recomp") ?? "maintain") : "cut";
    setGoal(next);
    setStart(today);
    setEnd(addDays(today, -1));
    setTarget(suggestTarget(next, weight));
    setRate(profile ? defaultWeeklyRatePct(next, profile.experience) : 0.5);
    setName("");
    setNote("");
  }, mode ? (mode.kind === "edit" ? `edit:${mode.span.id}` : mode.kind) : null);

  if (!profile || !mode) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const pickGoal = (g: GoalType) => {
    setGoal(g);
    if (mode.kind === "switch") {
      setTarget(suggestTarget(g, weight));
      setRate(defaultWeeklyRatePct(g, profile.experience));
    }
  };

  const preview =
    mode.kind === "switch"
      ? computeTargets({
          sex: profile.sex,
          age: new Date().getFullYear() - profile.birthYear,
          heightCm: profile.heightCm,
          weightKg: weight,
          activity: profile.activity,
          goal,
          weeklyRatePct: goal === "maintain" ? 0 : rate,
          targetWeightKg: target,
          adaptiveTdee: adaptive?.confidence === "high" ? adaptive.tdee : undefined,
        })
      : null;

  // Same day as the running cycle's start = replace it (a cycle that never really ran).
  const minStart = mode.kind === "switch" && running ? running.start : undefined;
  const editingRunning = mode.kind === "edit" && mode.span.ongoing;
  const valid = mode.kind === "switch" ? start <= today && (!minStart || start >= minStart) : start <= end && end <= today;

  const submit = async () => {
    if (mode.kind === "switch") {
      await switchCycle({ goal, startDate: start, currentWeightKg: weight, targetWeightKg: target, weeklyRatePct: goal === "maintain" ? 0 : rate, name, note, adaptiveTdee: adaptive?.confidence === "high" ? adaptive.tdee : undefined });
      cue("start");
      toast({ tone: "quest", title: `Nouveau cycle : ${name.trim() || CYCLE_META[goal].label}`, message: profile.targetsMode === "auto" ? "Objectifs caloriques recalculés" : "Pense à ajuster tes objectifs (mode manuel)" });
    } else if (mode.kind === "past") {
      await addPastCycle({ goal, startDate: start, endDate: end, name, note });
      toast({ tone: "success", title: "Cycle ajouté à l'historique" });
    } else {
      await updateCycle(mode.span.id, {
        ...(editingRunning ? {} : { goal, endDate: end }),
        startDate: start,
        name,
        note,
        ...(goal !== "maintain" || editingRunning ? { targetWeightKg: target } : {}),
      });
      toast({ tone: "success", title: "Cycle mis à jour" });
    }
    onClose();
  };

  const title = mode.kind === "switch" ? "Changer de cycle" : mode.kind === "past" ? "Ajouter un cycle passé" : `Modifier : ${mode.span.name}`;
  const description =
    mode.kind === "switch" && running
      ? `En cours : ${running.name} depuis le ${formatShort(running.start)}. Il sera clôturé la veille du nouveau.`
      : mode.kind === "past"
        ? "Pour garder la mémoire d'une sèche ou d'une prise de masse déjà faite."
        : undefined;

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      description={description}
      size="lg"
      footer={
        <Button block size="lg" onClick={submit} disabled={!valid}>
          {mode.kind === "switch" ? `Lancer : ${CYCLE_META[goal].label}` : mode.kind === "past" ? "Ajouter" : "Enregistrer"}
        </Button>
      }
    >
      <div className="space-y-4">
        {!editingRunning && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {GOALS.map((g) => (
              <ChoiceCard
                key={g}
                selected={goal === g}
                onClick={() => pickGoal(g)}
                icon={<span style={{ color: CYCLE_META[g].color }}>{GOAL_ICON[g]}</span>}
                title={
                  <span className="flex items-center gap-2">
                    {CYCLE_META[g].label}
                    {mode.kind === "switch" && running?.goal === g && <span className="rounded bg-white/10 px-1.5 text-[10px] font-semibold text-ink-3">EN COURS</span>}
                  </span>
                }
                description={GOAL_LABELS[g].hint}
              />
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label={mode.kind === "switch" ? "Début du cycle" : "Début"} htmlFor="cycle-start" hint={mode.kind === "switch" ? "Aujourd'hui, ou le jour où tu as réellement changé." : undefined}>
            <TextInput id="cycle-start" type="date" value={start} min={minStart} max={today} onChange={(e) => setStart(e.target.value || start)} />
          </Field>
          {mode.kind !== "switch" && !editingRunning ? (
            <Field label="Fin" htmlFor="cycle-end">
              <TextInput id="cycle-end" type="date" value={end} min={start} max={today} onChange={(e) => setEnd(e.target.value || end)} />
            </Field>
          ) : (
            (goal !== "maintain" || editingRunning) && (
              <Field label="Poids visé">
                <NumberInput value={target} onChange={(v) => setTarget(v ?? target)} step={0.5} min={30} max={300} unit="kg" stepper={false} />
              </Field>
            )
          )}
        </div>

        {mode.kind === "switch" && goal !== "maintain" && (
          <Field label={`Rythme visé : ${fmtDec(rate)} % du poids / semaine`} hint={goal === "cut" ? "Recommandé : 0,5–0,7 %." : goal === "bulk" ? "Prise de masse : 0,1–0,25 %/semaine limite le gain de gras." : undefined}>
            <input type="range" min={goal === "cut" ? 0.25 : 0.05} max={goal === "cut" ? 1 : 0.5} step={0.05} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full accent-[#4da3ff]" aria-label="Rythme hebdomadaire" />
          </Field>
        )}

        <Field label="Nom (optionnel)" htmlFor="cycle-name">
          <TextInput id="cycle-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={`Ex. ${CYCLE_META[goal].label} été 2026`} />
        </Field>
        <Field label="Note (optionnel)" htmlFor="cycle-note">
          <TextArea id="cycle-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={400} placeholder="Contexte, ressenti, ce qui a marché…" />
        </Field>

        {preview && (
          <Notice>
            Nouveaux objectifs estimés : <strong className="text-ink">{fmtInt(preview.kcal)} kcal</strong> · {preview.protein} g protéines · {preview.carbs} g glucides · {preview.fat} g lipides
            {profile.targetsMode === "manual" && " (tes objectifs sont en mode manuel : ils ne changeront pas automatiquement)"}. Le donjon de l&apos;objectif repart de ton poids actuel ({fmtDec(weight)} kg).
          </Notice>
        )}

        {mode.kind === "edit" && !mode.span.ongoing && mode.span.row && (
          <Button
            variant={confirmDelete ? "danger" : "ghost"}
            size="sm"
            block
            onClick={async () => {
              if (!confirmDelete) return setConfirmDelete(true);
              await deleteCycle(mode.span.row!.id);
              toast({ tone: "system", title: "Cycle supprimé de l'historique" });
              onClose();
            }}
          >
            <Trash2 /> {confirmDelete ? "Confirmer la suppression" : "Supprimer ce cycle"}
          </Button>
        )}
      </div>
    </Sheet>
  );
}
