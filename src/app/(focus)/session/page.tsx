"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ListOrdered, Minimize2, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { ExerciseIcon, RoutineIcon } from "@/components/icons/ExerciseIcon";
import { ExerciseBlock } from "@/components/workout/ExerciseBlock";
import { ExercisePickerSheet } from "@/components/workout/ExercisePickerSheet";
import { FinishSheet } from "@/components/workout/FinishSheet";
import { RestTimerBar } from "@/components/workout/RestTimerBar";
import { gainLabel } from "@/components/workout/SetRow";
import { SessionStarter } from "@/components/workout/SessionStarter";
import { Button, IconButton } from "@/components/ui/Button";
import { Field, TextInput, Toggle } from "@/components/ui/Fields";
import { EmptyState, PageSkeleton } from "@/components/ui/Feedback";
import { Panel } from "@/components/ui/Panel";
import { Sheet } from "@/components/ui/Sheet";
import { useActiveSession, useExerciseLibrary, useRoutine, useSessionSets } from "@/lib/db/hooks";
import { routineColor, routineIcon } from "@/lib/data/routines";
import { addExerciseToSession, blockSets, deleteSession, finishSession, removeExerciseFromSession, renameSession, reorderSessionExercises, slotAt } from "@/lib/db/repos/workout";
import { useRestTimer } from "@/lib/hooks/useRestTimer";
import { useSessionHistory } from "@/lib/hooks/useSessionHistory";
import { cue } from "@/lib/system/feedback";
import { showOverlay, toast } from "@/lib/system/store";
import { cn } from "@/lib/utils/cn";
import { fmtClock } from "@/lib/utils/format";

export default function SessionPage() {
  const router = useRouter();
  const { profile, prs, today } = useGame();
  const session = useActiveSession();
  const sets = useSessionSets(session?.id);
  const routine = useRoutine(session?.routineId);
  const { byId } = useExerciseLibrary();
  const history = useSessionHistory(session?.id, session?.exerciseIds ?? []);
  const timer = useRestTimer();
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [picking, setPicking] = useState(false);
  const [overview, setOverview] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [sessionPRs, setSessionPRs] = useState(0);
  // PR XP is capped at 3 per day (see game.ts); only promise XP that will count.
  // Finished sessions only: this session's records are tracked in sessionPRs.
  const prsToday = prs.filter((p) => p.date === today).length;
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameRoutine, setRenameRoutine] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default" && session) {
      // Ask once, quietly, so the rest timer can notify when the screen is off.
      void Notification.requestPermission().catch(() => undefined);
    }
  }, [session]);

  const ids = useMemo(() => session?.exerciseIds ?? [], [session?.exerciseIds]);
  const current = Math.min(index, Math.max(0, ids.length - 1));
  const exerciseId = ids[current];
  const exercise = exerciseId ? byId(exerciseId) : undefined;
  const slot = slotAt(ids, current);
  const exSets = useMemo(() => blockSets(sets ?? [], ids, current).sort((a, b) => Number(b.warmup) - Number(a.warmup) || a.order - b.order), [sets, ids, current]);
  const routineEx = routine?.exercises.filter((e) => e.exerciseId === exerciseId)[slot];
  const repRange: [number, number] = routineEx ? [routineEx.repsMin, routineEx.repsMax] : [8, 12];
  const restSec = routineEx?.restSec ?? exercise?.restSec ?? profile?.restTimerSec ?? 90;

  if (session === undefined || sets === undefined) return <PageSkeleton />;
  if (session === null)
    return (
      <>
        <div className="mb-2">
          <IconButton label="Retour" onClick={() => router.push("/workout")}>
            <ChevronLeft />
          </IconButton>
        </div>
        <SessionStarter onStarted={() => setIndex(0)} onPastCreated={(id) => router.push(`/workout/history/${id}`)} />
      </>
    );

  const elapsed = (now - new Date(session.startedAt).getTime()) / 1000;
  const progressOf = (index: number) => {
    const s = blockSets(sets, ids, index).filter((x) => !x.warmup);
    return [s.filter((x) => x.done).length, s.length] as const;
  };
  const [doneHere, totalHere] = exerciseId ? progressOf(current) : [0, 0];
  const exerciseComplete = totalHere > 0 && doneHere === totalHere;

  const onFinish = async (opts: { rpe?: number; notes?: string }) => {
    await finishSession(session, opts);
    timer.skip();
    cue("levelup");
    toast({ tone: "quest", title: "Séance terminée", message: session.name, xp: 100 });
    router.replace(`/workout/history/${session.id}?done=1`);
  };

  const onDiscard = async () => {
    await deleteSession(session.id);
    timer.skip();
    router.replace("/workout");
  };

  return (
    <div>
      <header className="sticky top-0 z-30 -mx-4 mb-3 flex items-center gap-2 border-b border-line/60 bg-void/80 px-3 py-2 backdrop-blur-xl">
        <IconButton label="Réduire (la séance continue)" onClick={() => router.push("/")}>
          <Minimize2 />
        </IconButton>
        <button
          type="button"
          className="group min-w-0 flex-1 text-center"
          onClick={() => {
            setNewName(session.name);
            setRenameRoutine(!!routine);
            setRenaming(true);
          }}
          aria-label={`Renommer la séance ${session.name}`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <RoutineIcon icon={routineIcon(session)} color={routineColor(session)} className="size-4" />
            <span className="truncate font-display text-sm font-semibold tracking-wide text-ink">{session.name}</span>
            <Pencil className="size-3 shrink-0 text-ink-3 transition group-hover:text-arise" />
          </span>
          <span className="block font-display text-lg leading-none font-bold text-good tabular">{fmtClock(elapsed)}</span>
        </button>
        <IconButton label="Vue d'ensemble des exercices" onClick={() => setOverview(true)}>
          <ListOrdered />
        </IconButton>
        <Button size="sm" onClick={() => setFinishing(true)}>
          Terminer
        </Button>
      </header>

      {ids.length > 0 && (
        <nav className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 no-scrollbar" aria-label="Exercices de la séance">
          {ids.map((id, i) => {
            const ex = byId(id);
            const [d, t] = progressOf(i);
            const complete = t > 0 && d === t;
            const n = slotAt(ids, i);
            return (
              <button
                key={`${id}-${n}`}
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === current ? "step" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition",
                  i === current ? "border-arise/60 bg-arise/15 text-ink" : complete ? "border-good/40 bg-good/10 text-ink-2" : "border-line bg-deep/60 text-ink-3",
                )}
              >
                {ex && <ExerciseIcon exercise={ex} className="h-5 w-4" />}
                <span className="max-w-28 truncate">{ex?.name ?? "?"}</span>
                {n > 0 && <span className="rounded bg-violet/20 px-1 text-[10px] font-bold text-violet-2">×{n + 1}</span>}
                <span className="tabular opacity-70">
                  {d}/{t}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {exercise ? (
        <AnimatePresence mode="wait">
          <motion.div key={`${exercise.id}-${slot}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
            <Panel>
              <ExerciseBlock
                session={session}
                exercise={exercise}
                slot={slot}
                sets={exSets}
                history={history?.get(exercise.id)}
                repRange={repRange}
                onSetCompleted={({ prs, gain, beat, values }) => {
                  cue("set");
                  const remainingSets = sets.filter((s) => !s.done && !s.warmup).length - 1;
                  if (remainingSets > 0) timer.start(restSec);
                  if (prs.length) {
                    setSessionPRs((n) => n + 1);
                    cue("pr");
                    showOverlay({ kind: "pr", exercise: exercise.name, weightKg: values.weightKg, reps: values.reps, kinds: prs, weighted: exercise.weighted || values.weightKg > 0, beat, xp: prsToday + sessionPRs < 3 ? 40 : undefined });
                  } else if (gain) {
                    cue("quest");
                    toast({ tone: "quest", title: `Progression : ${gainLabel(gain)}`, message: `${exercise.name} · mieux que la dernière séance` });
                  }
                }}
              />
            </Panel>
          </motion.div>
        </AnimatePresence>
      ) : (
        <EmptyState title="Séance libre" description="Ajoute ton premier exercice pour commencer." action={<Button onClick={() => setPicking(true)}><Plus /> Ajouter un exercice</Button>} />
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button variant="secondary" onClick={() => setIndex(Math.max(0, current - 1))} disabled={current === 0}>
          <ChevronLeft /> Préc.
        </Button>
        <Button variant="ghost" className="flex-1" onClick={() => setPicking(true)}>
          <Plus /> Exercice
        </Button>
        {current < ids.length - 1 ? (
          <Button variant={exerciseComplete ? "primary" : "secondary"} onClick={() => setIndex(current + 1)} className={cn(exerciseComplete && "animate-pulse-glow")}>
            Suivant <ChevronRight />
          </Button>
        ) : (
          <Button variant={exerciseComplete ? "primary" : "secondary"} onClick={() => setFinishing(true)} disabled={ids.length === 0}>
            Finir <ChevronRight />
          </Button>
        )}
      </div>

      <RestTimerBar active={timer.active} remaining={timer.remaining} total={timer.total} done={timer.done} onAdd={timer.add} onSkip={timer.skip} onPreset={timer.start} />

      <ExercisePickerSheet
        open={picking}
        onClose={() => setPicking(false)}
        added={ids}
        onPick={async (e) => {
          await addExerciseToSession(session, e.id, 3, 8);
          setIndex(ids.length);
        }}
      />

      <Sheet open={overview} onClose={() => setOverview(false)} title="Exercices de la séance" description="Réordonne ou retire des exercices">
        <ul className="space-y-2">
          {ids.map((id, i) => {
            const ex = byId(id);
            const [d, t] = progressOf(i);
            const n = slotAt(ids, i);
            const move = (dir: -1 | 1) => {
              const next = [...ids];
              [next[i], next[i + dir]] = [next[i + dir], next[i]];
              void reorderSessionExercises(session, next);
            };
            return (
              <li key={`${id}-${n}`} className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.02] p-2">
                {ex && <ExerciseIcon exercise={ex} className="h-10 w-7" />}
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { setIndex(i); setOverview(false); }}>
                  <span className="block truncate text-sm font-medium text-ink">
                    {ex?.name}
                    {n > 0 && <span className="ml-1.5 rounded bg-violet/20 px-1 text-[10px] font-bold text-violet-2">×{n + 1}</span>}
                  </span>
                  <span className="text-[11px] text-ink-3">
                    {d}/{t} séries
                  </span>
                </button>
                <IconButton label="Monter" size="sm" disabled={i === 0} onClick={() => move(-1)}>
                  <ArrowUp />
                </IconButton>
                <IconButton label="Descendre" size="sm" disabled={i === ids.length - 1} onClick={() => move(1)}>
                  <ArrowDown />
                </IconButton>
                <IconButton label={`Retirer ${ex?.name ?? "l'exercice"}`} size="sm" onClick={() => removeExerciseFromSession(session, i)}>
                  <Trash2 />
                </IconButton>
              </li>
            );
          })}
        </ul>
      </Sheet>

      <Sheet
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Renommer la séance"
        size="sm"
        footer={
          <Button
            block
            disabled={!newName.trim()}
            onClick={async () => {
              await renameSession(session, newName.trim(), renameRoutine && !!routine);
              setRenaming(false);
              toast({ tone: "success", title: "Séance renommée", message: newName.trim() });
            }}
          >
            Enregistrer
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Nom">
            <TextInput value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus placeholder="Ex. Push lourd" />
          </Field>
          {routine && <Toggle checked={renameRoutine} onChange={setRenameRoutine} label={`Renommer aussi le programme « ${routine.name} »`} description="Les prochaines séances porteront ce nom" />}
        </div>
      </Sheet>

      <FinishSheet open={finishing} onClose={() => setFinishing(false)} sets={sets} elapsedSec={elapsed} prCount={sessionPRs} onFinish={onFinish} onDiscard={onDiscard} />
    </div>
  );
}
