"use client";

import { CalendarPlus } from "lucide-react";
import { useMemo } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { RoutineIcon } from "@/components/icons/ExerciseIcon";
import { routineColor, routineIcon } from "@/lib/data/routines";
import { useRoutines } from "@/lib/db/hooks";
import type { Routine } from "@/lib/db/types";
import { addDays, formatDay, toKey, weekdayIndex, type DayKey } from "@/lib/utils/date";

/** Recent days where a program was planned but nothing was logged (probably forgotten). */
export function useMissedDays(windowDays = 14): { date: DayKey; routine: Routine }[] {
  const { profile, raw, today } = useGame();
  const routines = useRoutines();
  return useMemo(() => {
    if (!profile || !routines) return [];
    const done = raw.sessions.filter((s) => s.status === "done");
    const logged = new Set(done.map((s) => s.date));
    const firstUse = [toKey(new Date(profile.createdAt)), ...done.map((s) => s.date)].sort()[0];
    const out: { date: DayKey; routine: Routine }[] = [];
    for (let i = 1; i <= windowDays; i++) {
      const d = addDays(today, -i);
      if (d < firstUse) break;
      const routine = routines.find((r) => r.id === profile.schedule[weekdayIndex(d)]);
      if (routine && !logged.has(d)) out.push({ date: d, routine });
    }
    return out;
  }, [profile, routines, raw.sessions, today, windowDays]);
}

/** Suggestions "Push prévu lundi — rien d'enregistré" with a one-tap add. */
export function MissedDays({ onAdd, max = 3 }: { onAdd: (date: DayKey) => void; max?: number }) {
  const missed = useMissedDays().slice(0, max);
  if (!missed.length) return null;
  return (
    <div className="mb-3 space-y-1.5">
      <p className="text-[11px] font-semibold tracking-wider text-ink-3 uppercase">Séances prévues non notées</p>
      {missed.map(({ date, routine }) => {
        const color = routineColor(routine);
        return (
          <button
            key={date}
            type="button"
            onClick={() => onAdd(date)}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-line-strong bg-deep/40 px-3 py-2 text-left transition hover:border-arise/50 active:scale-[0.99]"
          >
            <RoutineIcon icon={routineIcon(routine)} color={color} className="size-5 opacity-80" />
            <span className="min-w-0 flex-1 text-sm">
              <span className="text-ink">{routine.name}</span>
              <span className="text-ink-3 first-letter:uppercase"> · {formatDay(date)}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-arise">
              <CalendarPlus className="size-3.5" /> Ajouter
            </span>
          </button>
        );
      })}
    </div>
  );
}
