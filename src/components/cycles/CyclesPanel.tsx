"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CalendarRange, Dumbbell, Flame, Gauge, History, Pencil, Plus, Repeat2, Scale, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { Button } from "@/components/ui/Button";
import { Panel, PanelHeader, StatTile } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/Progress";
import { Sheet } from "@/components/ui/Sheet";
import { db } from "@/lib/db";
import { CYCLE_META, cycleStats, type CycleSpan, type CycleStats } from "@/lib/domain/cycles";
import { cn } from "@/lib/utils/cn";
import { diffDays, formatShort, type DayKey } from "@/lib/utils/date";
import { fmtDec, fmtInt, fmtSigned } from "@/lib/utils/format";
import { CycleSheet, type CycleSheetMode } from "./CycleSheet";

function duration(days: number) {
  if (days < 14) return `${days} j`;
  const weeks = Math.round(days / 7);
  return weeks < 9 ? `${weeks} sem.` : `${fmtDec(days / 30.4)} mois`;
}

/** Live stats of every cycle (photo dates are read from the index, without loading the images). */
export function useCycleStats() {
  const { cycles, ledger, trend, raw, prs } = useGame();
  const photoDates = useLiveQuery(() => db.photos.orderBy("date").keys() as Promise<DayKey[]>, []);
  return useMemo(() => {
    const input = { ledger: ledger.days, trend: trend.series, metrics: raw.metrics, prDates: prs.map((p) => p.date), photoDates: photoDates ?? [] };
    return new Map(cycles.map((c) => [c.id, cycleStats(c, input)]));
  }, [cycles, ledger, trend, raw.metrics, prs, photoDates]);
}

export function CycleBadge({ span, className }: { span: Pick<CycleSpan, "goal" | "name">; className?: string }) {
  const color = CYCLE_META[span.goal].color;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold", className)} style={{ borderColor: `${color}66`, color, background: `${color}14` }}>
      <span className="size-1.5 rounded-full" style={{ background: color }} aria-hidden />
      {span.name}
    </span>
  );
}

/** Timeline of the cycles: one coloured segment per cycle, proportional to its length. */
function Timeline({ cycles, onSelect }: { cycles: CycleSpan[]; onSelect: (c: CycleSpan) => void }) {
  const first = cycles[0]?.start;
  const last = cycles.at(-1)?.end;
  if (!first || !last) return null;
  const total = Math.max(1, diffDays(first, last) + 1);
  return (
    <div>
      <div className="relative flex h-9 w-full overflow-hidden rounded-xl border border-line bg-void/50">
        {cycles.map((c, i) => {
          const prevEnd = i > 0 ? cycles[i - 1].end : null;
          const gap = prevEnd ? Math.max(0, diffDays(prevEnd, c.start) - 1) : 0;
          const len = diffDays(c.start, c.end) + 1;
          const color = CYCLE_META[c.goal].color;
          return (
            <span key={c.id} className="contents">
              {gap > 0 && <span style={{ width: `${(gap / total) * 100}%` }} aria-hidden />}
              <button
                type="button"
                onClick={() => onSelect(c)}
                className="relative flex min-w-[3px] items-center justify-center overflow-hidden border-r border-void/60 text-[10px] font-bold tracking-wide text-void transition hover:brightness-110"
                style={{ width: `${(len / total) * 100}%`, background: `linear-gradient(180deg, ${color}, ${color}bb)` }}
                aria-label={`${c.name} du ${formatShort(c.start)} au ${formatShort(c.end)}`}
                title={`${c.name} · ${formatShort(c.start)} → ${c.ongoing ? "en cours" : formatShort(c.end)}`}
              >
                {len / total > 0.12 && <span className="truncate px-1">{CYCLE_META[c.goal].short}</span>}
                {c.ongoing && <span className="absolute inset-y-0 right-0 w-1 animate-pulse bg-white/70" aria-hidden />}
              </button>
            </span>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-3">
        <span>{formatShort(first)}</span>
        <span>aujourd&apos;hui</span>
      </div>
    </div>
  );
}

function statLine(s: CycleStats) {
  return [
    s.deltaKg != null ? `${fmtSigned(s.deltaKg, 1, "kg")}` : null,
    s.ratePerWeek != null ? `${fmtSigned(s.ratePerWeek, 2, "kg/sem")}` : null,
    s.avgKcal != null ? `${fmtInt(s.avgKcal)} kcal/j` : null,
    `${s.sessions} séance${s.sessions > 1 ? "s" : ""}`,
  ].filter(Boolean) as string[];
}

/** Cycles memory: current cycle, timeline and the stats of every past cycle. */
export function CyclesPanel({ onShowMonth }: { onShowMonth?: (day: DayKey) => void }) {
  const { cycles } = useGame();
  const stats = useCycleStats();
  const [sheet, setSheet] = useState<CycleSheetMode | null>(null);
  const [detail, setDetail] = useState<CycleSpan | null>(null);
  const current = cycles.at(-1);
  const currentStats = current ? stats.get(current.id) : undefined;
  const past = [...cycles].reverse().filter((c) => !c.ongoing);

  return (
    <Panel>
      <PanelHeader
        title="Cycles"
        icon={<History />}
        subtitle="Sèche, prise de masse, maintien : la mémoire de chaque phase"
        action={
          <Button size="sm" onClick={() => setSheet({ kind: "switch" })}>
            <Repeat2 /> Changer
          </Button>
        }
      />

      {current && currentStats && (
        <button type="button" onClick={() => setDetail(current)} className="mb-4 block w-full rounded-2xl border p-3 text-left transition hover:brightness-110" style={{ borderColor: `${CYCLE_META[current.goal].color}55`, background: `${CYCLE_META[current.goal].color}0d` }}>
          <div className="flex items-center justify-between gap-2">
            <CycleBadge span={current} />
            <span className="text-[11px] text-ink-3">
              {current.ongoing ? "en cours" : "terminé"} · depuis le {formatShort(current.start)} · {duration(currentStats.days)}
            </span>
          </div>
          {currentStats.goalProgress != null && current.targetWeightKg != null && (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[11px] text-ink-3">
                <span>{fmtDec(currentStats.startWeight)} kg</span>
                <span>{Math.round(currentStats.goalProgress * 100)} % · objectif {fmtDec(current.targetWeightKg)} kg</span>
              </div>
              <ProgressBar value={currentStats.goalProgress} max={1} color={CYCLE_META[current.goal].color} height={6} label="Progression du cycle" />
            </div>
          )}
          <p className="mt-2 text-xs text-ink-2">{statLine(currentStats).join(" · ")}</p>
        </button>
      )}

      {cycles.length > 1 && (
        <div className="mb-4">
          <Timeline cycles={cycles} onSelect={setDetail} />
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-3">
            {(Object.keys(CYCLE_META) as (keyof typeof CYCLE_META)[])
              .filter((g) => cycles.some((c) => c.goal === g))
              .map((g) => (
                <li key={g} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: CYCLE_META[g].color }} /> {CYCLE_META[g].label}
                </li>
              ))}
          </ul>
        </div>
      )}

      {past.length > 0 ? (
        <ul className="space-y-2">
          {past.map((c) => {
            const s = stats.get(c.id);
            return (
              <li key={c.id}>
                <button type="button" onClick={() => setDetail(c)} className="flex w-full items-stretch gap-3 rounded-xl border border-line bg-white/[0.02] p-2.5 text-left transition hover:border-line-strong">
                  <span className="w-1 shrink-0 rounded-full" style={{ background: CYCLE_META[c.goal].color }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-ink">{c.name}</span>
                      <span className="shrink-0 text-[11px] text-ink-3">{s ? duration(s.days) : ""}</span>
                    </span>
                    <span className="block text-[11px] text-ink-3">
                      {formatShort(c.start)} → {formatShort(c.end)}
                    </span>
                    {s && <span className="mt-0.5 block truncate text-xs text-ink-2">{statLine(s).join(" · ")}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-ink-3">Quand tu passeras d&apos;une sèche à une prise de masse (ou au maintien), le cycle terminé sera gardé ici avec ses statistiques.</p>
      )}

      <Button variant="ghost" size="sm" className="mt-3" onClick={() => setSheet({ kind: "past" })}>
        <Plus /> Ajouter un cycle passé
      </Button>

      <CycleDetailSheet
        span={detail}
        stats={detail ? stats.get(detail.id) : undefined}
        onClose={() => setDetail(null)}
        onEdit={() => {
          if (detail) setSheet({ kind: "edit", span: detail });
          setDetail(null);
        }}
        onShowMonth={
          onShowMonth
            ? () => {
                if (detail) onShowMonth(detail.start);
                setDetail(null);
              }
            : undefined
        }
      />
      <CycleSheet mode={sheet} onClose={() => setSheet(null)} />
    </Panel>
  );
}

function CycleDetailSheet({ span, stats, onClose, onEdit, onShowMonth }: { span: CycleSpan | null; stats?: CycleStats; onClose: () => void; onEdit: () => void; onShowMonth?: () => void }) {
  if (!span || !stats) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const color = CYCLE_META[span.goal].color;
  return (
    <Sheet
      open
      onClose={onClose}
      title={span.name}
      description={`${CYCLE_META[span.goal].label} · ${formatShort(span.start)} → ${span.ongoing ? "en cours" : formatShort(span.end)} · ${duration(stats.days)}`}
      size="lg"
      footer={
        <div className="flex gap-2">
          {onShowMonth && (
            <Button variant="secondary" className="flex-1" onClick={onShowMonth}>
              <CalendarRange /> Voir au calendrier
            </Button>
          )}
          <Button variant="secondary" className="flex-1" onClick={onEdit}>
            <Pencil /> Modifier
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {stats.goalProgress != null && span.targetWeightKg != null && (
          <div>
            <div className="mb-1 flex justify-between text-xs text-ink-3">
              <span>Objectif {fmtDec(span.targetWeightKg)} kg</span>
              <span>{Math.round(stats.goalProgress * 100)} %</span>
            </div>
            <ProgressBar value={stats.goalProgress} max={1} color={color} label="Progression vers le poids visé" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatTile label="Poids (moy. 7 j)" icon={<Scale />} accent={color} value={stats.startWeight != null ? `${fmtDec(stats.startWeight)} → ${stats.endWeight != null ? fmtDec(stats.endWeight) : "?"}` : "-"} unit="kg" hint={stats.deltaKg != null ? fmtSigned(stats.deltaKg, 1, "kg") : "pas assez de pesées"} />
          <StatTile label="Rythme" icon={<Gauge />} accent={color} value={stats.ratePerWeek != null ? fmtSigned(stats.ratePerWeek, 2) : "-"} unit="kg/sem" hint={stats.startWeight && stats.ratePerWeek != null ? `${fmtSigned((stats.ratePerWeek / stats.startWeight) * 100, 2, "%")} du poids` : undefined} />
          <StatTile label="Calories moyennes" icon={<Flame />} accent="var(--color-warn)" value={stats.avgKcal != null ? fmtInt(stats.avgKcal) : "-"} unit="kcal" hint={stats.avgProtein != null ? `${fmtInt(stats.avgProtein)} g protéines · ${stats.loggedDays} j notés` : "aucun repas noté"} />
          <StatTile label="Séances" icon={<Dumbbell />} accent="#34d399" value={stats.sessions} hint={stats.planned ? `${stats.plannedDone}/${stats.planned} prévues · ${Math.round(stats.cardioMin)} min cardio` : `${Math.round(stats.cardioMin)} min cardio`} />
          <StatTile label="Records" icon={<Trophy />} accent="var(--color-violet-2)" value={stats.prs} hint={stats.photos ? `${stats.photos} photo${stats.photos > 1 ? "s" : ""}` : undefined} />
          <StatTile label="Adhérence" icon={<Gauge />} accent="#4da3ff" value={`${stats.adherence} %`} hint={stats.avgScore != null ? `score moyen ${Math.round(stats.avgScore)}` : undefined} />
        </div>
        {(stats.waist || stats.bodyFat || stats.avgSteps) && (
          <ul className="space-y-1 rounded-xl border border-line bg-white/[0.02] p-3 text-sm text-ink-2">
            {stats.waist && (
              <li>
                Tour de taille : {fmtDec(stats.waist.start)} → {fmtDec(stats.waist.end)} cm ({fmtSigned(stats.waist.end - stats.waist.start, 1, "cm")})
              </li>
            )}
            {stats.bodyFat && (
              <li>
                Masse grasse : {fmtDec(stats.bodyFat.start)} → {fmtDec(stats.bodyFat.end)} % ({fmtSigned(stats.bodyFat.end - stats.bodyFat.start, 1, "pt")})
              </li>
            )}
            {stats.avgSteps != null && <li>Pas moyens : {fmtInt(stats.avgSteps)} / jour</li>}
          </ul>
        )}
        {span.note && <p className="rounded-xl border border-line bg-white/[0.02] p-3 text-sm whitespace-pre-line text-ink-2">{span.note}</p>}
      </div>
    </Sheet>
  );
}
