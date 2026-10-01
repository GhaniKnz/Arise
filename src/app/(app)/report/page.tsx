"use client";

import { AlertCircle, Bot, CheckCircle2, ChevronLeft, ChevronRight, Circle, FileText, Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { Button, IconButton } from "@/components/ui/Button";
import { ErrorBox } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { apiFetch, ApiError } from "@/lib/api";
import type { ReportAnalysis } from "@/lib/ai/schemas";
import { buildReportContext } from "@/lib/ai/context";
import { db } from "@/lib/db";
import { useReport } from "@/lib/db/hooks";
import { patch, stamp } from "@/lib/db/repo";
import type { WeeklyReport } from "@/lib/db/types";
import { analyzeWeek, weekStats, type WeekStats } from "@/lib/domain/report";
import { addDays, formatShort, weekStart, weekdayIndex } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { fmtDec, fmtInt, fmtSigned, fmtSleep, plainDashes } from "@/lib/utils/format";

function Row({ label, cur, prev, format, betterUp, unit = "" }: { label: string; cur: number | null; prev: number | null | undefined; format: (v: number) => string; betterUp?: boolean; unit?: string }) {
  const delta = cur != null && prev != null ? cur - prev : null;
  const good = delta == null || betterUp == null ? null : betterUp ? delta >= 0 : delta <= 0;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/50 py-2.5 last:border-0">
      <span className="text-sm text-ink-2">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="font-display text-lg font-semibold text-ink">{cur == null ? "-" : format(cur)}</span>
        {delta != null && Math.abs(delta) > 0.001 && <span className={cn("text-xs", good == null ? "text-ink-3" : good ? "text-good" : "text-warn")}>{fmtSigned(delta, Math.abs(delta) < 10 ? 1 : 0, unit)}</span>}
      </span>
    </div>
  );
}

export default function ReportPage() {
  const g = useGame();
  const { profile, days, weights, ledger, today, currentWeight } = g;
  const defaultWeek = weekdayIndex(today) === 6 ? weekStart(today) : addDays(weekStart(today), -7);
  const [ws, setWs] = useState(defaultWeek);
  const stored = useReport(ws);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scores = useMemo(() => new Map([...ledger.days.entries()].filter(([, l]) => l.score.tracked).map(([k, l]) => [k, l.score.total])), [ledger]);
  const cur: WeekStats = useMemo(() => weekStats(days, weights, ws, scores), [days, weights, ws, scores]);
  const prev: WeekStats = useMemo(() => weekStats(days, weights, addDays(ws, -7), scores), [days, weights, ws, scores]);
  const analysis = useMemo(() => (profile ? analyzeWeek(cur, prev, profile.targets, profile.goal, currentWeight ?? profile.startWeightKg) : null), [cur, prev, profile, currentWeight]);
  const ai: ReportAnalysis | null = useMemo(() => {
    try {
      // Dashes only ever sit inside JSON strings, so the filter keeps the JSON valid.
      return stored?.aiText ? (JSON.parse(plainDashes(stored.aiText)) as ReportAnalysis) : null;
    } catch {
      return null;
    }
  }, [stored]);

  if (!profile || !analysis) return null;
  const inProgress = addDays(ws, 6) >= today;

  const runAi = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ report: ReportAnalysis }>("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: buildReportContext(cur, prev, g) }),
      });
      const text = JSON.stringify(res.report);
      if (stored) await patch(db.reports, stored.id, { aiText: text });
      else await db.reports.add(stamp<WeeklyReport>({ weekStart: ws, aiText: text }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Génération impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker="Weekly report"
        title="Rapport hebdo"
        action={
          <div className="flex items-center gap-1 rounded-xl border border-line bg-deep/60 p-1">
            <IconButton label="Semaine précédente" size="sm" onClick={() => setWs(addDays(ws, -7))}>
              <ChevronLeft />
            </IconButton>
            <span className="min-w-32 text-center text-sm font-semibold text-ink">
              {formatShort(ws)} – {formatShort(addDays(ws, 6))}
            </span>
            <IconButton label="Semaine suivante" size="sm" onClick={() => setWs(addDays(ws, 7))} disabled={addDays(ws, 7) > today}>
              <ChevronRight />
            </IconButton>
          </div>
        }
      />
      {inProgress && <p className="mb-3 text-xs text-warn">Semaine en cours : le bilan sera complet dimanche soir.</p>}

      <Panel glow hud className="mb-4">
        <PanelHeader title="Weekly report" icon={<FileText />} subtitle="Comparé à la semaine précédente" />
        <Row label="Poids (moy. 7 j)" cur={cur.weightEnd} prev={prev.weightEnd} format={(v) => `${fmtDec(v)} kg`} betterUp={profile.goal === "bulk"} />
        <div className="flex items-center justify-between gap-3 border-b border-line/50 py-2.5">
          <span className="text-sm text-ink-2">Variation de la semaine</span>
          <span className="font-display text-lg font-semibold text-ink">{cur.weightDelta == null ? "-" : fmtSigned(cur.weightDelta, 1, "kg")}</span>
        </div>
        <Row label="Calories moyennes" cur={cur.avgKcal} prev={prev.avgKcal} format={(v) => `${fmtInt(v)} kcal`} />
        <Row label="Protéines" cur={cur.avgProtein} prev={prev.avgProtein} format={(v) => `${fmtInt(v)} g/j`} betterUp />
        <Row label="Pas" cur={cur.avgSteps} prev={prev.avgSteps} format={(v) => `${fmtInt(v)}/j`} betterUp />
        <div className="flex items-center justify-between gap-3 border-b border-line/50 py-2.5">
          <span className="text-sm text-ink-2">Séances</span>
          <span className="font-display text-lg font-semibold text-ink">
            {cur.sessions} / {cur.plannedSessions}
          </span>
        </div>
        <Row label="Sommeil" cur={cur.avgSleepMin} prev={prev.avgSleepMin} format={(v) => fmtSleep(v)} betterUp unit="min" />
        <Row label="Score moyen" cur={cur.avgScore} prev={prev.avgScore} format={(v) => `${fmtInt(v)}/100`} betterUp />
      </Panel>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Panel>
          <PanelHeader title="Analyse" />
          <ul className="space-y-2.5">
            {analysis.insights.map((i) => (
              <li key={i.text} className="flex gap-2.5 text-sm text-ink-2">
                {i.tone === "good" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good" /> : i.tone === "focus" ? <AlertCircle className="mt-0.5 size-4 shrink-0 text-warn" /> : <Circle className="mt-0.5 size-4 shrink-0 text-ink-3" />}
                {i.text}
              </li>
            ))}
            {analysis.insights.length === 0 && <li className="text-sm text-ink-3">Pas assez de données cette semaine.</li>}
          </ul>
        </Panel>
        <Panel>
          <PanelHeader title="Recommandations" />
          <ul className="space-y-2.5">
            {analysis.recommendations.map((r) => (
              <li key={r} className="flex gap-2.5 text-sm text-ink">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-arise shadow-[0_0_6px_#4da3ff]" /> {r}
              </li>
            ))}
            {analysis.recommendations.length === 0 && <li className="text-sm text-ink-3">Rien à changer : continue comme ça.</li>}
          </ul>
          {analysis.focus && (
            <p className="mt-3 rounded-xl border border-violet/30 bg-violet/10 px-3 py-2 text-xs text-ink-2">
              Levier prioritaire : <strong className="text-ink">{analysis.focus}</strong>
            </p>
          )}
        </Panel>
      </div>

      <Panel className="mt-4">
        <PanelHeader title="Analyse ARISE AI" icon={<Bot />} subtitle="Lecture personnalisée de ta semaine par l'IA" />
        {ai ? (
          <div className="space-y-3">
            <p className="font-medium text-ink">{ai.headline}</p>
            <ul className="space-y-1.5 text-sm text-ink-2">
              {ai.analysis.map((a) => (
                <li key={a}>• {a}</li>
              ))}
            </ul>
            <p className="label pt-1">Pour la semaine prochaine</p>
            <ul className="space-y-1.5 text-sm text-ink">
              {ai.recommendations.map((r) => (
                <li key={r} className="flex gap-2">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-violet-2" /> {r}
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="sm" onClick={runAi} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles />} Régénérer
            </Button>
          </div>
        ) : (
          <Button variant="violet" onClick={runAi} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />} Générer l&apos;analyse IA
          </Button>
        )}
        {error && (
          <div className="mt-3">
            <ErrorBox title="Analyse IA indisponible" message={error} />
          </div>
        )}
      </Panel>
    </div>
  );
}
