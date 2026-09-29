"use client";

import { ChevronLeft, ChevronRight, Dumbbell, Flame, Footprints, HeartPulse, Moon, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { DaySheet } from "@/components/calendar/DaySheet";
import { Heatmap } from "@/components/calendar/Heatmap";
import { IconButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader, StatTile } from "@/components/ui/Panel";
import { addDays, addMonths, daysInMonth, formatMonth, monthStart, rangeKeys, weekdayIndex, WEEKDAYS_SHORT, type DayKey } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

const MARKERS = [
  { key: "session", icon: Dumbbell, color: "#34d399", label: "Musculation" },
  { key: "cardio", icon: HeartPulse, color: "#fb7185", label: "Cardio" },
  { key: "rest", icon: Moon, color: "#a78bfa", label: "Repos prévu" },
  { key: "kcal", icon: Target, color: "#4da3ff", label: "Calories respectées" },
  { key: "steps", icon: Footprints, color: "#fbbf24", label: "Pas atteints" },
] as const;

export default function CalendarPage() {
  const { ledger, today, profile } = useGame();
  const [month, setMonth] = useState(monthStart(today));
  const [selected, setSelected] = useState<DayKey | null>(null);

  const days = useMemo(() => rangeKeys(month, addDays(month, daysInMonth(month) - 1)), [month]);
  const lead = weekdayIndex(month);

  const stats = useMemo(() => {
    const past = days.filter((d) => d <= today);
    const ls = past.map((d) => ledger.days.get(d)).filter((l): l is NonNullable<typeof l> => !!l);
    const tracked = ls.filter((l) => l.score.tracked);
    const planned = ls.filter((l) => l.day.workoutPlanned);
    return {
      sessions: ls.reduce((a, l) => a + l.day.sessionsDone, 0),
      adherence: tracked.length ? Math.round((ls.filter((l) => l.validated).length / past.length) * 100) : 0,
      avgScore: tracked.length ? Math.round(tracked.reduce((a, l) => a + l.score.total, 0) / tracked.length) : 0,
      kcalDays: ls.filter((l) => l.quests.find((q) => q.id === "calories")?.done).length,
      stepDays: ls.filter((l) => l.quests.find((q) => q.id === "steps")?.done).length,
      plannedDone: planned.filter((l) => l.day.sessionsDone > 0).length,
      planned: planned.length,
    };
  }, [days, ledger, today]);

  if (!profile) return null;

  return (
    <>
      <PageHeader kicker="Système" title="Calendrier" subtitle="Tes jours de salle, ton adhérence et tes séries de jours" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_20rem]">
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <IconButton label="Mois précédent" onClick={() => setMonth(addMonths(month, -1))}>
              <ChevronLeft />
            </IconButton>
            <h2 className="font-display text-lg font-bold text-ink first-letter:uppercase">{formatMonth(month)}</h2>
            <IconButton label="Mois suivant" onClick={() => setMonth(addMonths(month, 1))} disabled={addMonths(month, 1) > today}>
              <ChevronRight />
            </IconButton>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold tracking-wider text-ink-3">
            {WEEKDAYS_SHORT.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: lead }, (_, i) => (
              <span key={`e${i}`} />
            ))}
            {days.map((d) => {
              const l = ledger.days.get(d);
              const future = d > today;
              const marks = {
                session: (l?.day.sessionsDone ?? 0) > 0,
                cardio: (l?.day.cardioMin ?? 0) > 0,
                rest: !future && !!l && !l.day.workoutPlanned && (l.day.sessionsDone ?? 0) === 0,
                kcal: !!l?.quests.find((q) => q.id === "calories")?.done,
                steps: !!l?.quests.find((q) => q.id === "steps")?.done,
              };
              return (
                <button
                  key={d}
                  type="button"
                  disabled={future}
                  onClick={() => setSelected(d)}
                  className={cn(
                    "relative flex aspect-square min-h-11 flex-col items-center justify-between rounded-xl border p-1 text-left transition",
                    d === today ? "border-arise shadow-[0_0_14px_-2px_rgb(77_163_255/0.7)]" : "border-line",
                    future ? "opacity-30" : "hover:border-arise/50",
                  )}
                  style={{ background: !future && l?.score.tracked ? `rgb(77 163 255 / ${(0.05 + (l.score.total / 100) * 0.25).toFixed(2)})` : undefined }}
                  aria-label={`${d}${l?.score.tracked ? `, score ${l.score.total}` : ""}${marks.session ? ", séance" : ""}`}
                >
                  <span className={cn("self-start text-[11px] font-semibold", d === today ? "text-arise" : "text-ink-2")}>{Number(d.slice(8))}</span>
                  <span className="flex flex-wrap justify-center gap-0.5">
                    {MARKERS.filter((m) => marks[m.key]).map((m) => (
                      <m.icon key={m.key} className="size-2.5 sm:size-3" style={{ color: m.color }} aria-hidden />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-ink-3">
            {MARKERS.map((m) => (
              <li key={m.key} className="flex items-center gap-1.5">
                <m.icon className="size-3.5" style={{ color: m.color }} /> {m.label}
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Séances ce mois" value={stats.sessions} hint={stats.planned ? `${stats.plannedDone}/${stats.planned} prévues` : undefined} accent="#34d399" />
            <StatTile label="Adhérence" value={`${stats.adherence} %`} hint="jours validés (≥ 70)" accent="#4da3ff" />
            <StatTile label="Score moyen" value={stats.avgScore} hint="jours suivis" />
            <StatTile label="Calories OK" value={`${stats.kcalDays} j`} hint={`pas atteints : ${stats.stepDays} j`} />
          </div>
          <Panel>
            <PanelHeader title="Séries de jours" icon={<Flame />} />
            <div className="flex items-end justify-around text-center">
              <div>
                <p className="font-display text-4xl font-bold text-ink">{ledger.streak.current}</p>
                <p className="text-xs text-ink-3">série actuelle</p>
              </div>
              <div>
                <p className="font-display text-4xl font-bold text-arise">{ledger.streak.best}</p>
                <p className="text-xs text-ink-3">meilleure série</p>
              </div>
            </div>
            <p className="mt-3 text-center text-[11px] text-ink-3">+150 XP tous les 7 jours validés d&apos;affilée</p>
          </Panel>
        </div>
      </div>

      <Panel className="mt-4">
        <PanelHeader title="Heatmap de discipline" subtitle="Chaque carré = un jour · intensité = score d'adhérence" />
        <Heatmap weeks={26} onSelect={setSelected} />
      </Panel>

      <DaySheet date={selected} onClose={() => setSelected(null)} />
    </>
  );
}
