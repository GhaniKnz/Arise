"use client";

import { Check, Moon } from "lucide-react";
import { useGame } from "@/components/providers/GameProvider";
import { useRoutines } from "@/lib/db/hooks";
import { RoutineIcon } from "@/components/icons/ExerciseIcon";
import { routineColor, routineIcon } from "@/lib/data/routines";
import { addDays, weekStart, WEEKDAYS_SHORT } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

/** Monday→Sunday strip: planned routine, done state, today highlight. */
export function WeekStrip({ className }: { className?: string }) {
  const { profile, raw, today } = useGame();
  const routines = useRoutines();
  const start = weekStart(today);
  const byId = new Map((routines ?? []).map((r) => [r.id, r]));
  return (
    <ol className={cn("week-strip grid grid-cols-7 gap-1.5", className)} aria-label="Semaine d'entraînement">
      {WEEKDAYS_SHORT.map((wd, i) => {
        const date = addDays(start, i);
        const plannedId = profile?.schedule[i] ?? null;
        const planned = plannedId ? byId.get(plannedId) : undefined;
        const done = raw.sessions.filter((s) => s.date === date && s.status === "done");
        const isToday = date === today;
        const past = date < today;
        const label = done[0]?.name ?? planned?.name ?? "Repos";
        const styled = done[0] ?? planned;
        const color = styled ? routineColor(styled) : undefined;
        return (
          <li
            key={wd}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 rounded-xl border px-0.5 py-2 text-center",
              isToday ? "border-arise/60 bg-arise/10 shadow-[0_0_16px_-4px_rgb(77_163_255/0.6)]" : "border-line bg-white/[0.02]",
            )}
            aria-label={`${wd} : ${label}${done.length ? ", terminé" : past && planned ? ", manqué" : ""}`}
          >
            <span className={cn("text-[10px] font-semibold tracking-wider", isToday ? "text-arise" : "text-ink-3")}>{wd}</span>
            <span
              className={cn("relative flex size-8 items-center justify-center rounded-lg", done.length ? "text-void" : "")}
              style={done.length ? { background: color ?? "var(--color-good)", boxShadow: `0 0 12px ${color ?? "var(--color-good)"}` } : planned ? { border: `1.5px solid ${color}`, boxShadow: `inset 0 0 10px -4px ${color}` } : undefined}
            >
              {done.length ? <Check className="size-4" strokeWidth={3} /> : planned && color ? <RoutineIcon icon={routineIcon(planned)} color={color} className="size-6" /> : <Moon className="size-3.5 text-ink-3" />}
            </span>
            <span className="w-full truncate px-0.5 text-[10px] text-ink-3">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
