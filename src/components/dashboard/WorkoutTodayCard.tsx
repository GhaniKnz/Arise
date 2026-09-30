"use client";

import { CheckCircle2, Dumbbell, Layers, Moon, Pencil, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { useGame } from "@/components/providers/GameProvider";
import { ExerciseIcon, RoutineIcon } from "@/components/icons/ExerciseIcon";
import { WeekStrip } from "@/components/workout/WeekStrip";
import { Button, LinkButton } from "@/components/ui/Button";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { useActiveSession, useExerciseLibrary, useRoutines } from "@/lib/db/hooks";
import { startSession } from "@/lib/db/repos/workout";
import { routineColor, routineIcon } from "@/lib/data/routines";
import { sessionMinutes } from "@/lib/domain/daily";
import { weekdayIndex } from "@/lib/utils/date";
import { fmtDuration, fmtInt } from "@/lib/utils/format";

export function WorkoutTodayCard() {
  const { profile, raw, today } = useGame();
  const routines = useRoutines();
  const active = useActiveSession();
  const { byId } = useExerciseLibrary();
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  if (!profile) return null;

  const plannedId = profile.schedule[weekdayIndex(today)];
  const routine = routines?.find((r) => r.id === plannedId);
  const doneToday = raw.sessions.filter((s) => s.date === today && s.status === "done");
  const doneSets = raw.sets.filter((s) => doneToday.some((x) => x.id === s.sessionId) && s.done && !s.warmup);

  const start = async () => {
    setStarting(true);
    try {
      await startSession({ routine });
      router.push("/session");
    } finally {
      setStarting(false);
    }
  };

  return (
    <Panel className="art-card art-card--training h-full">
      <Image src="/art/training-blades.png" alt="" aria-hidden width={440} height={440} unoptimized className="art-card__art" />
      <PanelHeader title="Entraînement prévu" icon={<Dumbbell />} />
      <WeekStrip className="mb-4" />
      {active ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-good/30 bg-good/10 p-3">
          <div>
            <p className="text-sm font-semibold text-ink">{active.name}</p>
            <p className="text-xs text-ink-3">Séance en cours</p>
          </div>
          <LinkButton href="/session" size="sm">
            <Play /> Reprendre
          </LinkButton>
        </div>
      ) : doneToday.length ? (
        <div className="flex items-center gap-3 rounded-xl border border-good/30 bg-good/10 p-3">
          <CheckCircle2 className="size-8 shrink-0 text-good" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink">{doneToday.map((s) => s.name).join(" + ")} — terminé</p>
            <p className="text-xs text-ink-2">
              {fmtDuration(doneToday.reduce((a, s) => a + sessionMinutes(s), 0) * 60)} · {doneSets.length} séries · {fmtInt(doneSets.reduce((a, s) => a + s.weightKg * s.reps, 0))} kg de volume
            </p>
          </div>
        </div>
      ) : routine ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Link href={`/workout/routines/${routine.id}`} className="group flex min-w-0 items-center gap-3" aria-label={`Modifier ${routine.name}`}>
              <span
                className="flex size-12 shrink-0 items-center justify-center rounded-2xl border bg-void/50"
                style={{ borderColor: `color-mix(in srgb, ${routineColor(routine)} 60%, transparent)`, boxShadow: `0 0 18px -6px ${routineColor(routine)}` }}
              >
                <RoutineIcon icon={routineIcon(routine)} color={routineColor(routine)} className="size-8" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="truncate font-display text-xl font-bold text-ink">{routine.name}</span>
                  <Pencil className="size-3.5 shrink-0 text-ink-3 transition group-hover:text-arise" />
                </span>
                <span className="flex items-center gap-2.5 text-xs text-ink-3">
                  <span className="flex items-center gap-1">
                    <Dumbbell className="size-3" /> {routine.exercises.length}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="size-3" /> {routine.exercises.reduce((a, e) => a + e.sets, 0)} séries
                  </span>
                </span>
              </span>
            </Link>
            <Button onClick={start} disabled={starting} className="shrink-0">
              <Play /> Go
            </Button>
          </div>
          <ul className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar" aria-label="Exercices prévus">
            {routine.exercises.map((e) => {
              const ex = byId(e.exerciseId);
              if (!ex) return null;
              return (
                <li key={e.exerciseId} className="flex w-20 shrink-0 flex-col items-center gap-1 rounded-xl border border-line bg-white/[0.02] px-1.5 py-2" title={ex.name}>
                  <ExerciseIcon exercise={ex} className="h-10 w-7" />
                  <span className="line-clamp-2 text-center text-[10px] leading-tight text-ink-2">{ex.name}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.02] p-3">
          <div className="flex items-center gap-3">
            <Moon className="size-6 text-violet-2" />
            <div>
              <p className="font-semibold text-ink">Jour de récupération</p>
              <p className="text-xs text-ink-3">Marche, mobilité, sommeil.</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={start} disabled={starting}>
            Séance libre
          </Button>
        </div>
      )}
    </Panel>
  );
}
