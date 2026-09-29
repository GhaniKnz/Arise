"use client";

import { BookOpen, ChevronRight, Dumbbell, HeartPulse, Pencil, Play, Plus, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { MuscleIcon } from "@/components/icons/MuscleIcon";
import { CARDIO_LABEL } from "@/components/quick/CardioSheet";
import { WeekStrip } from "@/components/workout/WeekStrip";
import { Button, LinkButton } from "@/components/ui/Button";
import { Select } from "@/components/ui/Fields";
import { EmptyState, PageSkeleton } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader, StatTile } from "@/components/ui/Panel";
import { ROUTINE_TYPE_META } from "@/lib/data/routines";
import { MUSCLE_LABEL } from "@/lib/data/exercises";
import { useActiveSession, useExerciseLibrary, useRoutines } from "@/lib/db/hooks";
import { updateProfile } from "@/lib/db/repos/profile";
import { deleteCardio, startSession } from "@/lib/db/repos/workout";
import type { Routine } from "@/lib/db/types";
import { sessionMinutes } from "@/lib/domain/daily";
import { setsPerMuscle, TRACKED_MUSCLES, WEEKLY_SET_TARGET } from "@/lib/domain/volume";
import { openSheet } from "@/lib/system/ui";
import { addDays, formatDay, monthStart, weekStart, WEEKDAYS_LONG } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { fmtDuration, fmtInt } from "@/lib/utils/format";

export default function WorkoutPage() {
  const { profile, raw, today, prs } = useGame();
  const routines = useRoutines();
  const active = useActiveSession();
  const { byId } = useExerciseLibrary();
  const router = useRouter();

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
        <Panel className="lg:col-span-2">
          <PanelHeader title="Cette semaine" icon={<Dumbbell />} />
          <WeekStrip />
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="Séances ce mois" value={monthSessions} />
            <StatTile label="Séries (semaine)" value={weekSets.filter((s) => s.done && !s.warmup).length} />
            <StatTile label="Volume (semaine)" value={fmtInt(weekVolume)} unit="kg" />
            <StatTile label="Records ce mois" value={monthPRs} accent="var(--color-warn)" />
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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="label text-ink-2">Mes programmes</h2>
          <LinkButton href="/workout/routines/new" size="sm" variant="secondary">
            <Plus /> Nouveau
          </LinkButton>
        </div>
        {routines.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {routines.map((r) => {
              const meta = ROUTINE_TYPE_META[r.type];
              return (
                <Panel key={r.id} className="flex flex-col">
                  <div className="flex items-start gap-2">
                    <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-bold text-ink">{r.name}</p>
                      <p className="text-xs text-ink-3">
                        {meta.label} · {r.exercises.length} exercices · {r.exercises.reduce((a, e) => a + e.sets, 0)} séries
                      </p>
                    </div>
                    <Link href={`/workout/routines/${r.id}`} className="flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-white/5 hover:text-ink" aria-label={`Modifier ${r.name}`}>
                      <Pencil className="size-4" />
                    </Link>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-ink-2">{r.exercises.map((e) => byId(e.exerciseId)?.name).filter(Boolean).join(" · ")}</p>
                  <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                    <div className="flex gap-0.5">
                      {r.exercises.slice(0, 6).map((e) => {
                        const ex = byId(e.exerciseId);
                        return ex ? <MuscleIcon key={e.exerciseId} primary={ex.primary} secondary={ex.secondary} className="h-8 w-6" /> : null;
                      })}
                    </div>
                    <Button size="sm" onClick={() => start(r)} disabled={!!active}>
                      <Play /> Go
                    </Button>
                  </div>
                </Panel>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<Dumbbell />} title="Aucun programme" description="Crée ton premier programme (Push, Pull, Legs…)." action={<LinkButton href="/workout/routines/new" size="sm">Créer un programme</LinkButton>} />
        )}
      </section>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Planning hebdomadaire" subtitle="Définit la quête « Séance » du jour" />
          <ul className="space-y-2">
            {WEEKDAYS_LONG.map((d, i) => (
              <li key={d} className="flex items-center gap-3">
                <span className="w-20 text-sm text-ink-2">{d}</span>
                <Select
                  aria-label={`Programme du ${d}`}
                  value={profile.schedule[i] ?? ""}
                  onChange={(e) => {
                    const next = [...profile.schedule];
                    next[i] = e.target.value || null;
                    void updateProfile({ schedule: next, sessionsPerWeek: next.filter(Boolean).length });
                  }}
                  className="h-10"
                >
                  <option value="">Repos</option>
                  {routines.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHeader
            title="Historique"
            icon={<Trophy />}
            action={
              <Link href="/calendar" className="text-xs text-ink-3 hover:text-ink">
                Calendrier →
              </Link>
            }
          />
          {done.length ? (
            <ul className="divide-y divide-line/60">
              {done.slice(0, 8).map((s) => {
                const ss = raw.sets.filter((x) => x.sessionId === s.id && x.done && !x.warmup);
                const sp = prs.filter((p) => p.sessionId === s.id).length;
                return (
                  <li key={s.id}>
                    <Link href={`/workout/history/${s.id}`} className="flex items-center gap-3 py-2.5 hover:bg-white/[0.02]">
                      <span className="size-2 rounded-full" style={{ background: ROUTINE_TYPE_META[s.type].color }} aria-hidden />
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
    </>
  );
}
