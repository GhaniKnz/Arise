"use client";

import { Calculator, LineChart, Scale, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { useGoalProgress } from "@/components/dashboard/GoalCard";
import { TimeChart } from "@/components/charts/TimeChart";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Fields";
import { Badge, InfoTip, Notice } from "@/components/ui/Feedback";
import { Panel, PanelHeader, StatTile } from "@/components/ui/Panel";
import { refreshAutoTargets, updateProfile } from "@/lib/db/repos/profile";
import { bmi, bmiLabel, computeTargets, maintenanceKcal } from "@/lib/domain/energy";
import { toast } from "@/lib/system/store";
import { openSheet } from "@/lib/system/ui";
import { addDays, formatShort } from "@/lib/utils/date";
import { fmtDec, fmtInt, fmtSigned } from "@/lib/utils/format";

type Range = "30" | "90" | "180" | "365" | "all";

export function WeightPanel() {
  const { profile, trend, today, adaptive, currentWeight } = useGame();
  const goal = useGoalProgress();
  const [range, setRange] = useState<Range>("90");

  const chartData = useMemo(() => {
    const from = range === "all" ? "0000" : addDays(today, -Number(range));
    const rows: Record<string, number | string | null>[] = trend.series.filter((p) => p.date >= from).map((p) => ({ date: p.date, weight: p.weight, avg: Math.round(p.avg * 100) / 100, proj: null }));
    const curve = goal?.projection.curve ?? [];
    if (curve.length > 1 && rows.length) {
      rows[rows.length - 1].proj = rows[rows.length - 1].avg;
      const horizon = addDays(today, range === "30" ? 60 : 180);
      for (const c of curve.slice(1)) if (c.date <= horizon) rows.push({ date: c.date, weight: null, avg: null, proj: Math.round(c.projected * 10) / 10 });
    }
    return rows;
  }, [trend.series, range, today, goal]);

  if (!profile || !goal) return null;
  const age = new Date().getFullYear() - profile.birthYear;
  const formulaTdee = maintenanceKcal({ sex: profile.sex, age, heightCm: profile.heightCm, weightKg: currentWeight ?? profile.startWeightKg }, profile.activity);
  const tdee = adaptive?.tdee ?? formulaTdee;
  const deficit = profile.targets.kcal - tdee;
  const p = goal.projection;
  const bmiValue = currentWeight ? bmi(currentWeight, profile.heightCm) : null;

  const applyAdaptive = async () => {
    if (!adaptive) return;
    const t = computeTargets({ sex: profile.sex, age, heightCm: profile.heightCm, weightKg: currentWeight ?? profile.startWeightKg, activity: profile.activity, goal: profile.goal, weeklyRatePct: profile.weeklyRatePct, targetWeightKg: profile.targetWeightKg, adaptiveTdee: adaptive.tdee });
    await updateProfile({ targets: { ...profile.targets, kcal: t.kcal, protein: t.protein, carbs: t.carbs, fat: t.fat, fiber: t.fiber }, targetsMode: "manual" });
    toast({ tone: "success", title: "Objectifs ajustés", message: `${fmtInt(t.kcal)} kcal/jour basés sur ta maintenance réelle` });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <StatTile label="Poids actuel" value={fmtDec(trend.latest?.value)} unit="kg" hint={trend.latest ? formatShort(trend.latest.date) : undefined} />
        <StatTile label="Moyenne 7 jours" value={fmtDec(trend.average7)} unit="kg" accent="var(--color-arise)" />
        <StatTile label="Évolution 7 j" value={trend.weekChange == null ? "—" : fmtSigned(trend.weekChange, 1)} unit="kg" />
        <StatTile label="Tendance" value={trend.weeklyRate == null ? "—" : fmtSigned(trend.weeklyRate, 2)} unit="kg/sem" hint="régression 3 semaines" />
        <StatTile label="IMC" value={bmiValue ? fmtDec(bmiValue) : "—"} hint={bmiValue ? bmiLabel(bmiValue) : undefined} className="col-span-2 sm:col-span-1" />
      </div>

      <Panel>
        <PanelHeader
          title="Courbe du poids"
          icon={<LineChart />}
          action={
            <Button size="sm" variant="secondary" onClick={() => openSheet("weight")}>
              <Scale /> Pesée
            </Button>
          }
        />
        <Segmented
          className="mb-3"
          size="sm"
          value={range}
          onChange={setRange}
          ariaLabel="Période"
          options={[
            { value: "30", label: "1M" },
            { value: "90", label: "3M" },
            { value: "180", label: "6M" },
            { value: "365", label: "1A" },
            { value: "all", label: "Tout" },
          ]}
        />
        {chartData.length > 1 ? (
          <TimeChart
            ariaLabel="Évolution du poids avec moyenne 7 jours et projection"
            data={chartData}
            height={260}
            series={[
              { key: "weight", label: "Pesée", color: "#7c87a6", kind: "dots" },
              { key: "avg", label: "Moyenne 7 jours", color: "#4da3ff", kind: "line", endDot: true },
              { key: "proj", label: "Projection", color: "#9085e9", kind: "line", dashed: true },
            ]}
            references={[{ y: profile.targetWeightKg, label: `Objectif ${fmtDec(profile.targetWeightKg)} kg`, color: "rgb(52 211 153 / 0.6)" }]}
            yDomain={[(min: number) => Math.floor(Math.min(min, profile.targetWeightKg) - 1), (max: number) => Math.ceil(max + 1)]}
            yFormat={(v) => fmtDec(v)}
          />
        ) : (
          <p className="py-8 text-center text-sm text-ink-3">Ajoute au moins deux pesées pour voir la courbe.</p>
        )}
        <p className="mt-2 text-[11px] text-ink-3">Les points gris sont les pesées brutes : l&apos;eau et le glycogène les font varier de ±1 kg. La ligne bleue est la tendance réelle.</p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel glow>
          <PanelHeader title="Cut projection" icon={<Target />} subtitle={p.basis === "observed" ? "Basée sur ta tendance réelle" : "Basée sur le rythme prévu (pas encore assez de données)"} />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[11px] text-ink-3">Poids (moy. 7 j)</dt>
              <dd className="font-display text-xl font-bold text-ink">{fmtDec(goal.current)} kg</dd>
            </div>
            <div>
              <dt className="text-[11px] text-ink-3">Objectif</dt>
              <dd className="font-display text-xl font-bold text-arise">{fmtDec(goal.target)} kg</dd>
            </div>
            <div>
              <dt className="text-[11px] text-ink-3">Écart calorique</dt>
              <dd className="font-display text-xl font-bold text-ink">{fmtSigned(Math.round(deficit), 0)} kcal/j</dd>
            </div>
            <div>
              <dt className="text-[11px] text-ink-3">Rythme</dt>
              <dd className="font-display text-xl font-bold text-ink">{fmtSigned(p.rateUsed, 2)} kg/sem</dd>
            </div>
          </dl>
          <div className="mt-4 rounded-xl border border-violet/30 bg-violet/10 p-3 text-center">
            {p.weeksToGoal != null && p.etaDate ? (
              <>
                <p className="font-display text-2xl font-bold text-ink">≈ {Math.max(1, Math.round(p.weeksToGoal))} semaines</p>
                <p className="text-sm text-ink-2">Objectif estimé vers le {formatShort(p.etaDate)}</p>
              </>
            ) : (
              <p className="text-sm text-ink-2">La tendance actuelle ne va pas vers l&apos;objectif : vérifie la régularité de la saisie ou ajuste les calories.</p>
            )}
          </div>
          <p className="mt-2 text-[11px] text-ink-3">Estimation indicative, recalculée à chaque pesée. Le rythme ralentit souvent en fin de sèche.</p>
        </Panel>

        <Panel>
          <PanelHeader
            title="Maintenance adaptative"
            icon={<Calculator />}
            action={
              <InfoTip>
                Estimée par bilan énergétique : apport moyen saisi − (variation de la tendance du poids × 7 700 kcal/kg) sur 28 jours. Plus tes repas sont saisis fidèlement, plus elle est juste.
              </InfoTip>
            }
          />
          {adaptive ? (
            <>
              <div className="flex items-baseline gap-2">
                <p className="font-display text-4xl font-bold text-ink">{fmtInt(adaptive.tdee)}</p>
                <span className="text-sm text-ink-3">kcal/jour</span>
                <Badge color={adaptive.confidence === "high" ? "#34d399" : adaptive.confidence === "medium" ? "#fbbf24" : "#f87171"} className="ml-auto">
                  Fiabilité {adaptive.confidence === "high" ? "haute" : adaptive.confidence === "medium" ? "moyenne" : "faible"}
                </Badge>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-ink-2">
                <li>Apport moyen : {fmtInt(adaptive.avgIntake)} kcal ({adaptive.daysLogged} jours saisis)</li>
                <li>Tendance : {fmtSigned(adaptive.weeklyRate, 2)} kg/semaine</li>
                <li>Formule initiale : {fmtInt(formulaTdee)} kcal ({fmtSigned(adaptive.tdee - formulaTdee, 0)} kcal d&apos;écart)</li>
              </ul>
              <Button className="mt-4" variant="secondary" block onClick={applyAdaptive}>
                Ajuster mes objectifs sur cette maintenance
              </Button>
            </>
          ) : (
            <>
              <p className="font-display text-3xl font-bold text-ink-2">{fmtInt(formulaTdee)} kcal</p>
              <p className="mt-1 text-sm text-ink-3">Estimation par formule (Mifflin-St Jeor × activité).</p>
              <Notice className="mt-3">Il faut ~10 jours de repas saisis et des pesées régulières sur 2 semaines pour calculer ta maintenance réelle.</Notice>
              {profile.targetsMode === "manual" && (
                <Button className="mt-3" size="sm" variant="ghost" onClick={async () => { await updateProfile({ targetsMode: "auto" }); await refreshAutoTargets(currentWeight ?? profile.startWeightKg); }}>
                  Revenir aux objectifs automatiques
                </Button>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
