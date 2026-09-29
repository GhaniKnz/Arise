"use client";

import { Flame, History, Info, NotebookPen, Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EquipmentIcon } from "@/components/icons/EquipmentIcon";
import { ExerciseIcon } from "@/components/icons/ExerciseIcon";
import { Button } from "@/components/ui/Button";
import { Chip, Toggle } from "@/components/ui/Fields";
import { Sheet } from "@/components/ui/Sheet";
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from "@/lib/data/exercises";
import { addSet, deleteSet, setDone, updateSet } from "@/lib/db/repos/workout";
import type { Exercise, Session, WorkoutSet } from "@/lib/db/types";
import { applySet, detectPRs, e1rm, gainVsPrevious, progressionHint, type PRKind, type SetGain } from "@/lib/domain/strength";
import type { ExerciseHistory } from "@/lib/hooks/useSessionHistory";
import { toast } from "@/lib/system/store";
import { formatShort } from "@/lib/utils/date";
import { fmtDec } from "@/lib/utils/format";
import { ExerciseEditorSheet } from "./ExerciseEditorSheet";
import { SetRow } from "./SetRow";

interface Props {
  session: Session;
  exercise: Exercise;
  sets: WorkoutSet[];
  history?: ExerciseHistory;
  repRange: [number, number];
  onSetCompleted?: (info: { set: WorkoutSet; prs: PRKind[]; gain: SetGain | null; beat?: string; values: { weightKg: number; reps: number } }) => void;
  compactHeader?: boolean;
}

export function ExerciseBlock({ session, exercise, sets, history, repRange, onSetCompleted, compactHeader }: Props) {
  const [menuSet, setMenuSet] = useState<WorkoutSet | null>(null);
  const [editing, setEditing] = useState(false);
  const weightedOf = (w: number) => exercise.weighted || w > 0;
  const working = sets.filter((s) => !s.warmup);
  const hint = useMemo(() => progressionHint(history?.last.map((s) => ({ weightKg: s.weightKg, reps: s.reps })) ?? [], repRange[0], repRange[1], exercise.primary === "quads" || exercise.primary === "hamstrings" || exercise.primary === "glutes" ? 5 : 2.5), [history, repRange, exercise.primary]);

  // Sets that are PRs relative to history + earlier sets of this session.
  const prIds = useMemo(() => {
    const ids = new Set<string>();
    if (!history || history.bests.count === 0) return ids;
    let bests = history.bests;
    for (const s of [...sets].filter((x) => x.done).sort((a, b) => (a.completedAt ?? "").localeCompare(b.completedAt ?? ""))) {
      if (detectPRs(s, bests, weightedOf(s.weightKg)).length) ids.add(s.id);
      bests = applySet(bests, s);
    }
    return ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sets, history]);

  const toggle = async (s: WorkoutSet, values: { weightKg: number; reps: number }) => {
    if (!s.done && values.reps <= 0) {
      toast({ tone: "warn", title: "Indique le nombre de répétitions" });
      return;
    }
    if (values.weightKg !== s.weightKg || values.reps !== s.reps) await updateSet(s.id, values);
    await setDone(s.id, !s.done);
    if (!s.done) {
      let bests = history?.bests;
      let prs: PRKind[] = [];
      let beat: string | undefined;
      if (bests && bests.count > 0) {
        for (const x of sets.filter((y) => y.done && y.id !== s.id)) bests = applySet(bests, x);
        prs = detectPRs({ ...s, ...values, done: true }, bests, weightedOf(values.weightKg));
        if (prs.includes("weight")) beat = `Ancien record : ${fmtDec(bests.weight)} kg`;
        else if (prs.includes("e1rm")) beat = `1RM estimé : ${fmtDec(bests.e1rm)} → ${fmtDec(e1rm(values.weightKg, values.reps))} kg`;
      }
      const idx = working.indexOf(s);
      const prev = s.warmup ? undefined : (history?.last[idx] ?? history?.last.at(-1));
      onSetCompleted?.({ set: s, prs, beat, gain: s.warmup ? null : gainVsPrevious(prev, values, weightedOf(values.weightKg)), values });
    }
  };

  const doneCount = working.filter((s) => s.done).length;

  return (
    <div>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="icon-tile flex h-16 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-white/[0.03] transition hover:border-arise/50"
          aria-label={`Modifier l'exercice ${exercise.name}`}
        >
          <ExerciseIcon exercise={exercise} className="h-14 w-10" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className={compactHeader ? "font-display text-lg font-bold text-ink" : "font-display text-2xl leading-tight font-bold text-ink"}>{exercise.name}</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
            <span>{MUSCLE_LABEL[exercise.primary]}</span>
            <span className="flex items-center gap-1">
              <EquipmentIcon equipment={exercise.equipment} className="size-3.5" /> {EQUIPMENT_LABEL[exercise.equipment]}
            </span>
            <span>
              {repRange[0]}–{repRange[1]} reps
            </span>
          </p>
        </div>
        <button type="button" onClick={() => setEditing(true)} className="flex size-9 shrink-0 items-center justify-center rounded-xl text-ink-3 hover:bg-white/5 hover:text-ink" aria-label={`Modifier l'exercice ${exercise.name}`}>
          <Pencil className="size-4.5" />
        </button>
        <Link href={`/workout/exercises/${exercise.id}`} className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-xl text-ink-3 hover:bg-white/5 hover:text-ink" aria-label={`Fiche de ${exercise.name}`}>
          <Info className="size-5" />
        </Link>
      </div>
      {exercise.notes && (
        <p className="mt-2 flex items-start gap-2 rounded-xl border border-violet/25 bg-violet/[0.06] px-3 py-2 text-[13px] text-ink-2">
          <NotebookPen className="mt-0.5 size-4 shrink-0 text-violet-2" /> {exercise.notes}
        </p>
      )}

      <div className="mt-3 space-y-1.5 rounded-xl border border-line bg-white/[0.02] px-3 py-2 text-[13px]">
        <p className="flex items-center gap-2 text-ink-2">
          <History className="size-4 shrink-0 text-ink-3" />
          {history?.last.length ? (
            <span className="min-w-0">
              Dernière séance{history.lastDate ? ` (${formatShort(history.lastDate)})` : ""} :{" "}
              <strong className="text-ink">{history.last.map((s) => (weightedOf(s.weightKg) && s.weightKg > 0 ? `${fmtDec(s.weightKg)} × ${s.reps}` : `${s.reps}`)).join(" · ")}</strong>
            </span>
          ) : (
            "Première fois : trouve une charge où tu gardes 1–3 reps en réserve."
          )}
        </p>
        {hint && (
          <p className="flex items-center gap-2 text-arise">
            <TrendingUp className="size-4 shrink-0" /> {hint.text}
          </p>
        )}
      </div>

      <div className="mt-3">
        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_3rem] gap-2 px-1.5 pb-1 text-center text-[10px] font-semibold tracking-wider text-ink-3 uppercase">
          <span>Série</span>
          <span>Préc.</span>
          <span>{exercise.weighted ? "kg" : "+kg"}</span>
          <span>Reps</span>
          <span>✓</span>
        </div>
        <div className="space-y-1">
          {sets.map((s) => {
            const workIdx = working.indexOf(s);
            const prev = s.warmup ? undefined : (history?.last[workIdx] ?? history?.last.at(-1));
            return (
              <SetRow
                key={s.id}
                set={s}
                index={s.warmup ? 0 : workIdx}
                previous={prev ? { weightKg: prev.weightKg, reps: prev.reps } : undefined}
                weighted={exercise.weighted}
                onCommit={(v) => updateSet(s.id, v)}
                onToggleDone={(v) => toggle(s, v)}
                onMenu={() => setMenuSet(s)}
                isPR={prIds.has(s.id)}
                gain={s.done && prev ? gainVsPrevious(prev, s, weightedOf(s.weightKg)) : null}
              />
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => addSet(session, exercise.id)}>
            <Plus /> Ajouter série
          </Button>
          <Button variant="ghost" size="sm" onClick={() => addSet(session, exercise.id, true)}>
            <Flame /> Échauffement
          </Button>
          <span className="ml-auto text-xs text-ink-3 tabular">
            {doneCount}/{working.length}
          </span>
        </div>
      </div>

      <ExerciseEditorSheet open={editing} onClose={() => setEditing(false)} exercise={exercise} />

      <Sheet open={!!menuSet} onClose={() => setMenuSet(null)} title={menuSet?.warmup ? "Série d'échauffement" : `Série ${menuSet ? working.indexOf(menuSet) + 1 : ""}`} size="sm">
        {menuSet && (
          <div className="space-y-4">
            <Toggle
              checked={menuSet.warmup}
              onChange={async (v) => {
                await updateSet(menuSet.id, { warmup: v });
                setMenuSet({ ...menuSet, warmup: v });
              }}
              label="Échauffement"
              description="Exclu du volume et des records"
            />
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-2">Effort ressenti (RPE)</p>
              <div className="flex flex-wrap gap-1.5">
                {[6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((v) => (
                  <Chip
                    key={v}
                    active={menuSet.rpe === v}
                    onClick={async () => {
                      await updateSet(menuSet.id, { rpe: v });
                      setMenuSet({ ...menuSet, rpe: v });
                    }}
                  >
                    {String(v).replace(".", ",")}
                  </Chip>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-ink-3">RPE 8 ≈ 2 reps en réserve · RPE 10 = échec.</p>
            </div>
            <Button
              variant="danger"
              block
              onClick={async () => {
                await deleteSet(menuSet.id);
                setMenuSet(null);
              }}
            >
              <Trash2 /> Supprimer la série
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
