"use client";

import { ArrowLeft, Layers, Lightbulb, NotebookPen, Pencil, Repeat, Target, TrendingUp, Trophy, Weight } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EquipmentIcon } from "@/components/icons/EquipmentIcon";
import { ExerciseIcon } from "@/components/icons/ExerciseIcon";
import { MuscleIcon } from "@/components/icons/MuscleIcon";
import { ExerciseEditorSheet } from "@/components/workout/ExerciseEditorSheet";
import { TimeChart } from "@/components/charts/TimeChart";
import { Button, IconButton } from "@/components/ui/Button";
import { Badge, EmptyState, PageSkeleton } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader, StatTile } from "@/components/ui/Panel";
import { EQUIPMENT_LABEL, LEVEL_LABEL, MUSCLE_LABEL } from "@/lib/data/exercises";
import { useExerciseLibrary, useExerciseSets } from "@/lib/db/hooks";
import { e1rm, setVolume } from "@/lib/domain/strength";
import { formatDay, formatShort } from "@/lib/utils/date";
import { fmtDec, fmtInt, fmtSigned } from "@/lib/utils/format";

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { byId } = useExerciseLibrary();
  const ex = byId(decodeURIComponent(id));
  const data = useExerciseSets(ex?.id);
  const [editing, setEditing] = useState(false);

  const stats = useMemo(() => {
    if (!data?.sets.length) return null;
    const bySession = new Map<string, typeof data.sets>();
    for (const s of data.sets) if (!s.warmup) bySession.set(s.sessionId, [...(bySession.get(s.sessionId) ?? []), s]);
    const rows = [...bySession.entries()]
      .map(([sid, sets]) => {
        const sess = data.sessions.get(sid)!;
        const top = sets.reduce((a, b) => (e1rm(b.weightKg, b.reps) > e1rm(a.weightKg, a.reps) ? b : a));
        return {
          sid,
          date: sess.date,
          startedAt: sess.startedAt,
          top,
          e1rm: Math.round(Math.max(...sets.map((s) => e1rm(s.weightKg, s.reps))) * 10) / 10,
          maxWeight: Math.max(...sets.map((s) => s.weightKg)),
          maxReps: Math.max(...sets.map((s) => s.reps)),
          volume: sets.reduce((a, s) => a + setVolume(s), 0),
          sets: sets.sort((a, b) => a.order - b.order),
        };
      })
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    const all = data.sets.filter((s) => !s.warmup);
    const bestWeight = all.reduce((a, b) => (b.weightKg > a.weightKg || (b.weightKg === a.weightKg && b.reps > a.reps) ? b : a));
    const bestE1 = all.reduce((a, b) => (e1rm(b.weightKg, b.reps) > e1rm(a.weightKg, a.reps) ? b : a));
    const bestVol = all.reduce((a, b) => (setVolume(b) > setVolume(a) ? b : a));
    const first = rows[0].e1rm;
    const last = rows.at(-1)!.e1rm;
    return { rows, bestWeight, bestE1, bestVol, maxReps: Math.max(...all.map((s) => s.reps)), progress: first > 0 ? ((last - first) / first) * 100 : 0 };
  }, [data]);

  if (!ex) return <EmptyState title="Exercice introuvable" action={<Link href="/workout/exercises" className="text-arise">Bibliothèque →</Link>} />;
  if (data === undefined) return <PageSkeleton />;
  const weighted = ex.weighted || (stats?.bestWeight.weightKg ?? 0) > 0;

  return (
    <>
      <div className="mb-2">
        <IconButton label="Retour" onClick={() => router.back()}>
          <ArrowLeft />
        </IconButton>
      </div>
      <PageHeader
        kicker={MUSCLE_LABEL[ex.primary]}
        title={ex.name}
        subtitle={ex.nameEn}
        action={
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <Pencil /> Modifier
          </Button>
        }
      />
      <ExerciseEditorSheet open={editing} onClose={() => setEditing(false)} exercise={ex} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
        <div className="space-y-4">
          <Panel className="flex flex-col items-center">
            <div className="flex items-center gap-4">
              {ex.icon && !ex.icon.startsWith("view:") && (
                <span className="flex h-24 w-20 items-center justify-center rounded-2xl border border-arise/30 bg-arise/[0.06]">
                  <ExerciseIcon exercise={ex} className="h-16 w-14" />
                </span>
              )}
              <MuscleIcon primary={ex.primary} secondary={ex.secondary} view="both" className="h-48 w-auto" title={`Muscles ciblés : ${MUSCLE_LABEL[ex.primary]}`} />
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              <Badge color="#4da3ff">{MUSCLE_LABEL[ex.primary]}</Badge>
              {ex.secondary.map((m) => (
                <Badge key={m} color="#a78bfa">
                  {MUSCLE_LABEL[m]}
                </Badge>
              ))}
            </div>
            <dl className="mt-4 grid w-full grid-cols-3 gap-2 text-center text-xs">
              <div>
                <dt className="text-ink-3">Équipement</dt>
                <dd className="mt-0.5 flex items-center justify-center gap-1 text-ink">
                  <EquipmentIcon equipment={ex.equipment} className="size-3.5" />
                  {EQUIPMENT_LABEL[ex.equipment]}
                </dd>
              </div>
              <div>
                <dt className="text-ink-3">Niveau</dt>
                <dd className="mt-0.5 text-ink">{LEVEL_LABEL[ex.level]}</dd>
              </div>
              <div>
                <dt className="text-ink-3">Repos</dt>
                <dd className="mt-0.5 text-ink">{ex.restSec} s</dd>
              </div>
            </dl>
          </Panel>
          {ex.notes && (
            <Panel>
              <PanelHeader title="Mes notes" icon={<NotebookPen />} />
              <p className="text-sm whitespace-pre-line text-ink-2">{ex.notes}</p>
            </Panel>
          )}
          {ex.instructions.length > 0 && (
            <Panel>
              <PanelHeader title="Exécution" />
              <ol className="space-y-2 text-sm text-ink-2">
                {ex.instructions.map((s, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-arise/15 text-[11px] font-bold text-arise">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
              {ex.tips?.map((t) => (
                <p key={t} className="mt-3 flex gap-2 text-xs text-ink-3">
                  <Lightbulb className="size-4 shrink-0 text-warn" /> {t}
                </p>
              ))}
            </Panel>
          )}
        </div>

        <div className="space-y-4">
          {stats ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {weighted ? (
                  <>
                    <StatTile label="Charge max" icon={<Weight />} value={`${fmtDec(stats.bestWeight.weightKg)} kg`} hint={`× ${stats.bestWeight.reps} reps`} accent="var(--color-warn)" />
                    <StatTile label="1RM estimé" icon={<Target />} value={`${fmtDec(e1rm(stats.bestE1.weightKg, stats.bestE1.reps))} kg`} hint={`${fmtDec(stats.bestE1.weightKg)} × ${stats.bestE1.reps}`} accent="var(--color-arise)" />
                    <StatTile label="Meilleure série" icon={<Layers />} accent="var(--color-violet-2)" value={`${fmtInt(setVolume(stats.bestVol))} kg`} hint="volume (charge × reps)" />
                  </>
                ) : (
                  <StatTile label="Reps max" icon={<Repeat />} value={stats.maxReps} accent="var(--color-warn)" />
                )}
                <StatTile label="Progression" icon={<TrendingUp />} value={fmtSigned(stats.progress, 0, "%")} hint={`${stats.rows.length} séances`} accent="var(--color-good)" />
              </div>
              <Panel>
                <PanelHeader title={weighted ? "Progression de la force" : "Progression des répétitions"} icon={<Trophy />} />
                <TimeChart
                  ariaLabel={`Progression de ${ex.name}`}
                  data={stats.rows.map((r) => ({ date: r.date, e1rm: r.e1rm, max: r.maxWeight, reps: r.maxReps }))}
                  series={
                    weighted
                      ? [
                          { key: "e1rm", label: "1RM estimé (kg)", color: "#4da3ff", kind: "area", endDot: true },
                          { key: "max", label: "Charge max (kg)", color: "#c98500", kind: "line" },
                        ]
                      : [{ key: "reps", label: "Reps max", color: "#4da3ff", kind: "area", endDot: true }]
                  }
                  yFormat={(v) => fmtInt(v)}
                  yDomain={["dataMin - 5", "dataMax + 5"]}
                />
                <p className="mt-2 text-[11px] text-ink-3">1RM estimé avec la formule d&apos;Epley (fiable jusqu&apos;à ~10–12 reps).</p>
              </Panel>
              <Panel>
                <PanelHeader title="Volume par séance" />
                <TimeChart ariaLabel="Volume par séance" data={stats.rows.map((r) => ({ date: r.date, volume: r.volume }))} series={[{ key: "volume", label: "Volume (kg)", color: "#9085e9", kind: "bar" }]} height={160} yFormat={(v) => fmtInt(v)} />
              </Panel>
              <Panel>
                <PanelHeader title="Historique" />
                <ul className="divide-y divide-line/60">
                  {[...stats.rows].reverse().slice(0, 12).map((r) => (
                    <li key={r.sid}>
                      <Link href={`/workout/history/${r.sid}`} className="flex items-center gap-3 py-2 text-sm hover:bg-white/[0.02]">
                        <span className="inline-block w-24 shrink-0 text-ink-3 first-letter:uppercase">{formatShort(r.date)}</span>
                        <span className="min-w-0 flex-1 truncate text-ink-2 tabular">{r.sets.map((s) => (weighted ? `${fmtDec(s.weightKg)}×${s.reps}` : `${s.reps}`)).join("  ·  ")}</span>
                        {weighted && <span className="shrink-0 text-xs text-ink-3">1RM {fmtInt(r.e1rm)}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-ink-3 first-letter:uppercase">Dernière séance : {formatDay(stats.rows.at(-1)!.date)}</p>
              </Panel>
            </>
          ) : (
            <EmptyState icon={<Trophy />} title="Pas encore d'historique" description="Fais cet exercice en séance : tes records et ta progression apparaîtront ici." />
          )}
        </div>
      </div>
    </>
  );
}
