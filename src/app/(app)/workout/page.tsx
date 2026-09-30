"use client";

import { BookOpen, CalendarDays, CalendarPlus, CalendarRange, ChevronRight, Dumbbell, HeartPulse, History, Layers, Pencil, Play, Plus, Trophy, Weight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { ExerciseIcon, RoutineIcon } from "@/components/icons/ExerciseIcon";
import { MuscleIcon } from "@/components/icons/MuscleIcon";
import { CARDIO_LABEL } from "@/components/quick/CardioSheet";
import { MissedDays } from "@/components/workout/MissedDays";
import { PastSessionSheet } from "@/components/workout/PastSessionSheet";
import { SplitSheet } from "@/components/workout/SplitSheet";
import { WeekStrip } from "@/components/workout/WeekStrip";
import { Button, LinkButton } from "@/components/ui/Button";
import { Select } from "@/components/ui/Fields";
import { EmptyState, PageSkeleton } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader, StatTile } from "@/components/ui/Panel";
import { routineColor, routineIcon } from "@/lib/data/routines";
import { MUSCLE_LABEL } from "@/lib/data/exercises";
import { useActiveSession, useExerciseLibrary, useRoutines } from "@/lib/db/hooks";
import { updateProfile } from "@/lib/db/repos/profile";
import { deleteCardio, startSession } from "@/lib/db/repos/workout";
import type { Routine } from "@/lib/db/types";
import { sessionMinutes } from "@/lib/domain/daily";
import { setsPerMuscle, TRACKED_MUSCLES, WEEKLY_SET_TARGET } from "@/lib/domain/volume";
import { openSheet } from "@/lib/system/ui";
import { addDays, formatDay, monthStart, weekStart, WEEKDAYS_LONG, WEEKDAYS_SHORT, type DayKey } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { fmtDuration, fmtInt } from "@/lib/utils/format";

export default function WorkoutPage() {
  const { profile, raw, today, prs } = useGame();
  const routines = useRoutines();
  const active = useActiveSession();
  const { byId } = useExerciseLibrary();
  const router = useRouter();
  const [splitOpen, setSplitOpen] = useState(false);
  const [adding, setAdding] = useState<{ date?: DayKey } | null>(null);

  const week = weekStart(today);
  const month = monthStart(today);
  const done = useMemo(() => raw.sessions.filter((s) => s.status === "done").sort((a, b) => b.startedAt.localeCompare(a.startedAt)), [raw.sessions]);
  const weekSets = useMemo(() => {
    const ids = new Set(done.map((d) => d.id));
    return raw.sets.filter((s) => s.date >= week && s.date <= today && ids.has(s.sessionId));
  }, [raw.sets, week, today, done]);
  const muscles = useMemo(() => setsPerMuscle(weekSets, byId), [weekSets, byId]);

  if (!profile || !routines) return <PageSkeleton />;
  const monthSessions = done.filter((s) => s.date >= month).length;
  const weekVolume = weekSets.filter((s) => s.done && !s.warmup).reduce((a, s) => a + s.weightKg * s.reps, 0);
  const monthPRs = prs.filter((p) => p.date >= month).length;

  const start = async (routine?: Routine) => {
    await startSession({ routine });
    router.push("/session");
  };

  return (
    <>
      <PageHeader
        kicker="Entraînement"
        title="Workout"
        action={
          active ? (
            <LinkButton href="/session">
              <Play /> Reprendre
            </LinkButton>
          ) : (
            <LinkButton href="/session">
              <Play /> Commencer
            </LinkButton>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2 lg:self-start">
          <PanelHeader title="Cette semaine" icon={<Dumbbell />} />
          <WeekStrip />
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="Séances ce mois" value={monthSessions} icon={<CalendarDays />} />
            <StatTile label="Séries (semaine)" value={weekSets.filter((s) => s.done && !s.warmup).length} icon={<Layers />} accent="var(--color-violet-2)" />
            <StatTile label="Volume (semaine)" value={fmtInt(weekVolume)} unit="kg" icon={<Weight />} accent="var(--color-cyan)" />
            <StatTile label="Records ce mois" value={monthPRs} accent="var(--color-warn)" icon={<Trophy />} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Volume par muscle" subtitle={`Séries/semaine · repère ${WEEKLY_SET_TARGET[0]}–${WEEKLY_SET_TARGET[1]}`} />
          <ul className="space-y-2">
            {TRACKED_MUSCLES.map((m) => {
              const v = muscles.get(m) ?? 0;
              const pct = Math.min(1, v / WEEKLY_SET_TARGET[1]);
              const inZone = v >= WEEKLY_SET_TARGET[0];
              return (
                <li key={m} className="flex items-center gap-2 text-xs">
                  <MuscleIcon primary={m} className="h-6 w-4" />
                  <span className="w-24 truncate text-ink-2">{MUSCLE_LABEL[m]}</span>
                  <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <span className="absolute inset-y-0 border-l border-white/20" style={{ left: `${(WEEKLY_SET_TARGET[0] / WEEKLY_SET_TARGET[1]) * 100}%` }} aria-hidden />
                    <span className={cn("absolute inset-y-0 left-0 rounded-full", inZone ? "bg-good" : "bg-arise")} style={{ width: `${pct * 100}%` }} />
                  </span>
                  <span className="w-8 text-right text-ink tabular">{fmtInt(v)}</span>
                </li>
              );
            })}
          </ul>
          <Link href="/knowledge/hypertrophie-volume" className="mt-3 block text-[11px] text-arise hover:underline">
            Pourquoi 10–20 séries ? →
          </Link>
        </Panel>
      </div>

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="label flex items-center gap-2 text-ink-2">
            <Dumbbell className="size-4 text-arise" /> Mes séances
          </h2>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSplitOpen(true)}>
              <CalendarRange /> Split
            </Button>
            <LinkButton href="/workout/routines/new" size="sm" variant="secondary">
              <Plus /> Nouvelle
            </LinkButton>
          </div>
        </div>
        {routines.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {routines.map((r) => {
              const color = routineColor(r);
              const days = profile.schedule.map((id, i) => (id === r.id ? WEEKDAYS_SHORT[i] : null)).filter(Boolean);
              return (
                <Panel key={r.id} className="card-hover group flex flex-col overflow-hidden" style={{ borderColor: `color-mix(in srgb, ${color} 30%, transparent)` }}>
                  <div className="pointer-events-none absolute -top-14 -right-12 size-36 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-45" style={{ background: color }} aria-hidden />
                  <div className="relative flex items-center gap-3">
                    <Link
                      href={`/workout/routines/${r.id}`}
                      className="flex size-12 shrink-0 items-center justify-center rounded-2xl border bg-void/50"
                      style={{ borderColor: `color-mix(in srgb, ${color} 60%, transparent)`, boxShadow: `0 0 18px -6px ${color}` }}
                      aria-label={`Modifier ${r.name}`}
                    >
                      <RoutineIcon icon={routineIcon(r)} color={color} className="size-8" />
                    </Link>
                    <Link href={`/workout/routines/${r.id}`} className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-display text-lg font-bold text-ink">{r.name}</span>
                        <Pencil className="size-3.5 shrink-0 text-ink-3 transition group-hover:text-arise" />
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-ink-3">
                        <span className="flex items-center gap-1">
                          <Dumbbell className="size-3" /> {r.exercises.length}
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="size-3" /> {r.exercises.reduce((a, e) => a + e.sets, 0)} séries
                        </span>
                        {days.length > 0 && (
                          <span className="flex items-center gap-1" style={{ color }}>
                            <CalendarDays className="size-3" /> {days.join(" · ")}
                          </span>
                        )}
                      </span>
                    </Link>
                  </div>
                  <div className="relative mt-3 flex gap-1 overflow-hidden" aria-label={r.exercises.map((e) => byId(e.exerciseId)?.name).filter(Boolean).join(", ")}>
                    {r.exercises.slice(0, 7).map((e, i) => {
                      const ex = byId(e.exerciseId);
                      return ex ? (
                        <span key={`${e.exerciseId}-${i}`} className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.03]" title={ex.name}>
                          <ExerciseIcon exercise={ex} className="h-9 w-6" />
                        </span>
                      ) : null;
                    })}
                    {r.exercises.length > 7 && <span className="self-center pl-1 text-[11px] text-ink-3">+{r.exercises.length - 7}</span>}
                  </div>
                  <div className="relative mt-auto flex items-center justify-end gap-2 pt-3">
                    <LinkButton href={`/workout/routines/${r.id}`} size="sm" variant="ghost">
                      <Pencil /> Modifier
                    </LinkButton>
                    <Button size="sm" onClick={() => start(r)} disabled={!!active}>
                      <Play /> Go
                    </Button>
                  </div>
                </Panel>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Dumbbell />}
            title="Aucune séance"
            description="Crée ta première séance ou choisis un split (Push/Pull, Upper/Lower…)."
            action={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setSplitOpen(true)}>
                  <CalendarRange /> Choisir un split
                </Button>
                <LinkButton href="/workout/routines/new" size="sm">
                  Créer
                </LinkButton>
              </div>
            }
          />
        )}
      </section>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Planning hebdomadaire"
            icon={<CalendarDays />}
            subtitle="Définit la quête « Séance » du jour"
            action={
              <Button size="sm" variant="ghost" onClick={() => setSplitOpen(true)}>
                <CalendarRange /> Split
              </Button>
            }
          />
          <ul className="space-y-2">
            {WEEKDAYS_LONG.map((d, i) => {
              const planned = routines.find((r) => r.id === profile.schedule[i]);
              return (
                <li key={d} className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-white/[0.02]">
                    {planned ? <RoutineIcon icon={routineIcon(planned)} color={routineColor(planned)} className="size-6" /> : <span className="text-[10px] text-ink-3">zZ</span>}
                  </span>
                  <span className="w-20 shrink-0 text-sm text-ink-2">{d}</span>
                  <Select
                    aria-label={`Programme du ${d}`}
                    value={profile.schedule[i] ?? ""}
                    onChange={(e) => {
                      const next = [...profile.schedule];
                      next[i] = e.target.value || null;
                      void updateProfile({ schedule: next, sessionsPerWeek: next.filter(Boolean).length });
                    }}
                    className="h-10 min-w-0 flex-1"
                  >
                    <option value="">Repos</option>
                    {routines.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </Select>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel>
          <PanelHeader
            title="Historique"
            icon={<Trophy />}
            action={
              <Button size="sm" variant="secondary" onClick={() => setAdding({})}>
                <CalendarPlus /> Séance passée
              </Button>
            }
          />
          <MissedDays max={2} onAdd={(date) => setAdding({ date })} />
          {done.length ? (
            <ul className="divide-y divide-line/60">
              {done.slice(0, 8).map((s) => {
                const ss = raw.sets.filter((x) => x.sessionId === s.id && x.done && !x.warmup);
                const sp = prs.filter((p) => p.sessionId === s.id).length;
                return (
                  <li key={s.id}>
                    <Link href={`/workout/history/${s.id}`} className="flex items-center gap-3 py-2.5 hover:bg-white/[0.02]">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.03]" aria-hidden>
                        <RoutineIcon icon={routineIcon(s)} color={routineColor(s)} className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{s.name}</span>
                        <span className="block text-[11px] text-ink-3 first-letter:uppercase">
                          {formatDay(s.date)} · {fmtDuration(sessionMinutes(s) * 60)} · {ss.length} séries · {fmtInt(ss.reduce((a, x) => a + x.weightKg * x.reps, 0))} kg
                        </span>
                      </span>
                      {sp > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-warn/15 px-2 py-0.5 text-[11px] font-semibold text-warn">
                          <Trophy className="size-3" /> {sp}
                        </span>
                      )}
                      <ChevronRight className="size-4 text-ink-3" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={<Dumbbell />} title="Aucune séance enregistrée" action={<LinkButton href="/session" size="sm">Commencer ma première séance</LinkButton>} />
          )}
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-line/60 pt-2.5 text-xs">
            <Link href="/workout/history" className="flex items-center gap-1 font-medium text-arise hover:underline">
              <History className="size-3.5" /> Tout l&apos;historique{done.length > 8 ? ` (${done.length})` : ""}
            </Link>
            <Link href="/calendar" className="text-ink-3 hover:text-ink">
              Calendrier →
            </Link>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Cardio"
            icon={<HeartPulse />}
            action={
              <Button size="sm" variant="secondary" onClick={() => openSheet("cardio")}>
                <Plus /> Ajouter
              </Button>
            }
          />
          {raw.cardio.length ? (
            <ul className="divide-y divide-line/60">
              {[...raw.cardio]
                .sort((a, b) => b.date.localeCompare(a.date))
                .filter((c) => c.date >= addDays(today, -30))
                .slice(0, 6)
                .map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block text-ink">{CARDIO_LABEL[c.type]}</span>
                      <span className="block text-[11px] text-ink-3 first-letter:uppercase">
                        {formatDay(c.date)} · {c.durationMin} min{c.speedKmh ? ` · ${c.speedKmh} km/h` : ""}
                        {c.inclinePct ? ` · ${c.inclinePct} %` : ""}
                      </span>
                    </span>
                    <span className="text-ink-2 tabular">{c.kcal ? `${fmtInt(c.kcal)} kcal` : ""}</span>
                    <button type="button" onClick={() => deleteCardio(c.id)} className="text-xs text-ink-3 hover:text-bad" aria-label="Supprimer">
                      ✕
                    </button>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">Aucun cardio récent. Le tapis incliné, le vélo ou la marche comptent !</p>
          )}
        </Panel>
        <Link href="/workout/exercises" className="panel group flex items-center gap-4 p-5 transition hover:border-arise/40">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-violet/15 text-violet-2">
            <BookOpen className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-bold text-ink">Bibliothèque d&apos;exercices</span>
            <span className="block text-sm text-ink-3">Consignes, muscles ciblés, progression et records</span>
          </span>
          <ChevronRight className="size-5 text-ink-3 transition group-hover:translate-x-1" />
        </Link>
      </div>
      <SplitSheet open={splitOpen} onClose={() => setSplitOpen(false)} />
      <PastSessionSheet
        open={adding !== null}
        initialDate={adding?.date}
        onClose={() => setAdding(null)}
        onCreated={(id) => {
          setAdding(null);
          router.push(`/workout/history/${id}?edit=1`);
        }}
      />
    </>
  );
}
