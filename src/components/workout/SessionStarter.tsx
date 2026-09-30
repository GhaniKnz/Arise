"use client";

import { CalendarPlus, Dumbbell, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { ExerciseIcon, RoutineIcon } from "@/components/icons/ExerciseIcon";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { routineColor, routineIcon } from "@/lib/data/routines";
import { useExerciseLibrary, useRoutines } from "@/lib/db/hooks";
import { startSession } from "@/lib/db/repos/workout";
import type { Routine } from "@/lib/db/types";
import { weekdayIndex } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { PastSessionSheet } from "./PastSessionSheet";

export function SessionStarter({ onStarted, onPastCreated }: { onStarted: () => void; onPastCreated: (id: string) => void }) {
  const { profile, today } = useGame();
  const routines = useRoutines();
  const { byId } = useExerciseLibrary();
  const [busy, setBusy] = useState(false);
  const [past, setPast] = useState(false);
  const plannedId = profile?.schedule[weekdayIndex(today)];
  const sorted = [...(routines ?? [])].sort((a, b) => (a.id === plannedId ? -1 : b.id === plannedId ? 1 : 0));

  const start = async (routine?: Routine) => {
    setBusy(true);
    try {
      await startSession({ routine });
      onStarted();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader kicker="Mode focus" title="Choisis ta séance" subtitle="Tout est prérempli avec ta dernière performance." />
      <div className="space-y-3">
        {sorted.length === 0 && (
          <EmptyState icon={<Dumbbell />} title="Aucun programme" description="Crée un programme ou lance une séance libre." action={<Link href="/workout/routines/new" className="text-sm text-arise">Créer un programme →</Link>} />
        )}
        {sorted.map((r) => {
          const planned = r.id === plannedId;
          const color = routineColor(r);
          return (
            <Panel key={r.id} glow={planned} className={cn("flex items-center gap-4", planned && "hud")}>
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border bg-void/50" style={{ borderColor: `color-mix(in srgb, ${color} 60%, transparent)`, boxShadow: `0 0 18px -6px ${color}` }}>
                <RoutineIcon icon={routineIcon(r)} color={color} className="size-8" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-display text-lg font-bold text-ink">{r.name}</p>
                  {planned && <span className="rounded-full bg-arise/15 px-2 py-0.5 text-[10px] font-semibold text-arise uppercase">Prévue aujourd&apos;hui</span>}
                </div>
                <p className="mt-0.5 text-xs text-ink-3">
                  {r.exercises.length} exercices · {r.exercises.reduce((a, e) => a + e.sets, 0)} séries
                </p>
                <div className="mt-2 flex gap-1">
                  {r.exercises.slice(0, 7).map((e, i) => {
                    const ex = byId(e.exerciseId);
                    return ex ? <ExerciseIcon key={`${e.exerciseId}-${i}`} exercise={ex} className="h-8 w-6" /> : null;
                  })}
                </div>
              </div>
              <Button onClick={() => start(r)} disabled={busy} variant={planned ? "primary" : "secondary"}>
                <Play /> Go
              </Button>
            </Panel>
          );
        })}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" onClick={() => start()} disabled={busy}>
            <Sparkles /> Séance libre
          </Button>
          <Button variant="ghost" size="lg" onClick={() => setPast(true)}>
            <CalendarPlus /> Séance passée
          </Button>
        </div>
      </div>
      <PastSessionSheet
        open={past}
        onClose={() => setPast(false)}
        onCreated={(id) => {
          setPast(false);
          onPastCreated(id);
        }}
      />
    </div>
  );
}
