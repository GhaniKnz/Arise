"use client";

import { ChartNoAxesCombined, Lightbulb } from "lucide-react";
import { useMemo, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { TimeChart } from "@/components/charts/TimeChart";
import { Segmented } from "@/components/ui/Fields";
import { Notice } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader, StatTile } from "@/components/ui/Panel";
import { findCorrelations } from "@/lib/domain/insights";
import { addDays, weekStart } from "@/lib/utils/date";
import { fmtDec, fmtInt, fmtSleep, mean } from "@/lib/utils/format";

type Range = "28" | "56" | "84" | "182";

export default function AnalyticsPage() {
  const { profile, days, trend, today, ledger, raw } = useGame();
  const [range, setRange] = useState<Range>("56");
  const from = addDays(today, -Number(range) + 1);

  const inRange = useMemo(() => days.filter((d) => d.date >= from && d.date <= today), [days, from, today]);
  const daily = useMemo(
    () =>
      inRange.map((d) => ({
        date: d.date,
        kcal: d.entries ? Math.round(d.kcal) : null,
        protein: d.entries ? Math.round(d.protein) : null,
        steps: d.steps ?? null,
        sleep: d.sleepMin != null ? Math.round((d.sleepMin / 60) * 10) / 10 : null,
        score: ledger.days.get(d.date)?.score.tracked ? ledger.days.get(d.date)!.score.total : null,
      })),
    [inRange, ledger],
  );
  const weekly = useMemo(() => {
    const m = new Map<string, { date: string; volume: number; sessions: number }>();
    for (const d of inRange) {
      const k = weekStart(d.date);
      const row = m.get(k) ?? { date: k, volume: 0, sessions: 0 };
      row.volume += d.volume;
      row.sessions += d.sessionsDone;
      m.set(k, row);
    }
    return [...m.values()];
  }, [inRange]);
  const weight = trend.series.filter((p) => p.date >= from).map((p) => ({ date: p.date, weight: p.weight, avg: Math.round(p.avg * 100) / 100 }));
  const waist = raw.metrics.filter((m) => m.date >= from && m.waistCm != null).sort((a, b) => a.date.localeCompare(b.date)).map((m) => ({ date: m.date, waist: m.waistCm! }));
  const correlations = useMemo(() => (profile ? findCorrelations(days, profile.targets) : []), [days, profile]);

  if (!profile) return null;
  const t = profile.targets;
  const logged = inRange.filter((d) => d.entries > 0);
  const avg = (xs: (number | undefined)[]) => {
    const v = xs.filter((x): x is number => x != null);
    return v.length ? mean(v) : null;
  };

  return (
    <>
      <PageHeader kicker="Analytics" title="Analyse avancée" subtitle="Tendances, régularité et relations entre tes habitudes" />
      <Segmented
        className="mb-4"
        value={range}
        onChange={setRange}
        ariaLabel="Période"
        size="sm"
        options={[
          { value: "28", label: "4 sem." },
          { value: "56", label: "8 sem." },
          { value: "84", label: "12 sem." },
          { value: "182", label: "6 mois" },
        ]}
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Calories moy." value={fmtInt(avg(logged.map((d) => d.kcal)))} unit="kcal" hint={`cible ${fmtInt(t.kcal)}`} />
        <StatTile label="Protéines moy." value={fmtInt(avg(logged.map((d) => d.protein)))} unit="g" hint={`cible ${t.protein}`} />
        <StatTile label="Pas moy." value={fmtInt(avg(inRange.map((d) => d.steps)))} hint={`cible ${fmtInt(t.steps)}`} />
        <StatTile label="Sommeil moy." value={fmtSleep(avg(inRange.map((d) => d.sleepMin)))} />
        <StatTile label="Séances" value={inRange.reduce((a, d) => a + d.sessionsDone, 0)} hint={`${(inRange.reduce((a, d) => a + d.sessionsDone, 0) / (Number(range) / 7)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/sem.`} />
        <StatTile label="Jours saisis" value={`${logged.length}/${inRange.length}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Poids & moyenne 7 jours" />
          <TimeChart
            ariaLabel="Poids et moyenne mobile"
            data={weight}
            series={[
              { key: "weight", label: "Pesée", color: "#7c87a6", kind: "dots" },
              { key: "avg", label: "Moyenne 7 j", color: "#4da3ff", kind: "line", endDot: true },
            ]}
            yDomain={["dataMin - 0.5", "dataMax + 0.5"]}
            yFormat={(v) => fmtDec(v)}
          />
        </Panel>
        <Panel>
          <PanelHeader title="Calories vs objectif" />
          <TimeChart ariaLabel="Calories quotidiennes" data={daily} series={[{ key: "kcal", label: "Calories", color: "#3987e5", kind: "bar" }]} references={[{ y: t.kcal, label: `objectif ${fmtInt(t.kcal)}` }]} yFormat={(v) => fmtInt(v)} />
        </Panel>
        <Panel>
          <PanelHeader title="Protéines (g)" />
          <TimeChart ariaLabel="Protéines quotidiennes" data={daily} series={[{ key: "protein", label: "Protéines", color: "#3987e5", kind: "bar" }]} references={[{ y: t.protein, label: `objectif ${t.protein} g` }]} yFormat={(v) => fmtInt(v)} />
        </Panel>
        <Panel>
          <PanelHeader title="Pas quotidiens" />
          <TimeChart ariaLabel="Pas quotidiens" data={daily} series={[{ key: "steps", label: "Pas", color: "#c98500", kind: "bar" }]} references={[{ y: t.steps, label: `objectif ${fmtInt(t.steps)}` }]} yFormat={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : fmtInt(v))} />
        </Panel>
        <Panel>
          <PanelHeader title="Sommeil (heures)" />
          <TimeChart ariaLabel="Sommeil" data={daily} series={[{ key: "sleep", label: "Sommeil", color: "#9085e9", kind: "bar" }]} references={[{ y: t.sleepMin / 60, label: "objectif" }]} yDomain={[0, "dataMax + 1"]} yFormat={(v) => fmtDec(v)} />
        </Panel>
        <Panel>
          <PanelHeader title="Score d'adhérence" />
          <TimeChart ariaLabel="Score quotidien" data={daily} series={[{ key: "score", label: "Score", color: "#4da3ff", kind: "area", endDot: true }]} references={[{ y: 70, label: "jour validé" }]} yDomain={[0, 100]} yFormat={(v) => fmtInt(v)} />
        </Panel>
        <Panel>
          <PanelHeader title="Volume d'entraînement / semaine" />
          <TimeChart ariaLabel="Volume hebdomadaire" data={weekly} series={[{ key: "volume", label: "Volume (kg)", color: "#9085e9", kind: "bar" }]} yFormat={(v) => (v >= 1000 ? `${Math.round(v / 1000)}t` : fmtInt(v))} height={200} />
        </Panel>
        <Panel>
          <PanelHeader title="Séances / semaine" />
          <TimeChart ariaLabel="Séances hebdomadaires" data={weekly} series={[{ key: "sessions", label: "Séances", color: "#199e70", kind: "bar" }]} references={[{ y: profile.schedule.filter(Boolean).length, label: "prévues" }]} yDomain={[0, "dataMax + 1"]} yFormat={(v) => fmtInt(v)} height={200} />
        </Panel>
        {waist.length > 1 && (
          <Panel className="lg:col-span-2">
            <PanelHeader title="Tour de taille (cm)" />
            <TimeChart ariaLabel="Tour de taille" data={waist} series={[{ key: "waist", label: "Tour de taille", color: "#4da3ff", kind: "area", endDot: true }]} yDomain={["dataMin - 1", "dataMax + 1"]} yFormat={(v) => fmtDec(v)} height={180} />
          </Panel>
        )}
      </div>

      <Panel className="mt-4">
        <PanelHeader title="Corrélations dans tes données" icon={<ChartNoAxesCombined />} />
        {correlations.length ? (
          <ul className="space-y-2.5">
            {correlations.map((c) => (
              <li key={c.id} className="flex gap-2.5 text-sm text-ink-2">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-warn" />
                <span>
                  {c.text} <span className="text-[11px] text-ink-3">(n = {c.n[0]} vs {c.n[1]} jours)</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-3">Pas encore assez de données croisées (il faut au moins 4 jours dans chaque groupe).</p>
        )}
        <Notice className="mt-4">Une corrélation n&apos;est pas une causalité : ce sont des pistes à tester, pas des preuves.</Notice>
      </Panel>
    </>
  );
}
