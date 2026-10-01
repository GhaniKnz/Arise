import type { BodyMetric, Cycle, GoalType } from "@/lib/db/types";
import { addDays, diffDays, type DayKey } from "@/lib/utils/date";
import { mean } from "@/lib/utils/format";
import type { DayLedger } from "./game";

export const CYCLE_META: Record<GoalType, { label: string; short: string; color: string }> = {
  cut: { label: "Sèche", short: "SÈCHE", color: "#fb923c" },
  bulk: { label: "Prise de masse", short: "MASSE", color: "#34d399" },
  recomp: { label: "Recomposition", short: "RECOMPO", color: "#a78bfa" },
  maintain: { label: "Maintien", short: "MAINTIEN", color: "#4da3ff" },
};

/** A cycle with its resolved last day (today while it runs). */
export interface CycleSpan {
  /** Row id, or "initial" for the implicit first cycle before any switch. */
  id: string;
  goal: GoalType;
  name: string;
  start: DayKey;
  end: DayKey;
  ongoing: boolean;
  startWeightKg?: number;
  targetWeightKg?: number;
  kcalTarget?: number;
  note?: string;
  row?: Cycle;
}

export interface ProfileCycleInfo {
  goal: GoalType;
  startDate: DayKey;
  startWeightKg: number;
  targetWeightKg: number;
  kcal: number;
}

/**
 * Timeline of cycles, oldest first. Without any recorded cycle the profile's
 * goal since its start date is the (implicit) current cycle. A cycle without
 * end date ends the day before the next one starts.
 */
export function cycleSpans(cycles: Cycle[], profile: ProfileCycleInfo, today: DayKey): CycleSpan[] {
  if (!cycles.length) {
    return [{ id: "initial", goal: profile.goal, name: CYCLE_META[profile.goal].label, start: profile.startDate, end: today, ongoing: true, startWeightKg: profile.startWeightKg, targetWeightKg: profile.targetWeightKg, kcalTarget: profile.kcal }];
  }
  const sorted = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.createdAt.localeCompare(b.createdAt));
  return sorted.map((c, i) => {
    const next = sorted[i + 1];
    const last = !next;
    const end = c.endDate ?? (next ? addDays(next.startDate, -1) : today);
    return {
      id: c.id,
      goal: c.goal,
      name: c.name?.trim() || CYCLE_META[c.goal].label,
      start: c.startDate,
      end: end < c.startDate ? c.startDate : end > today ? today : end,
      ongoing: last && !c.endDate,
      startWeightKg: c.startWeightKg,
      targetWeightKg: c.targetWeightKg,
      kcalTarget: c.kcalTarget,
      note: c.note,
      row: c,
    };
  });
}

/** Cycle covering a day (the latest one when they overlap). */
export function cycleAt(spans: CycleSpan[], date: DayKey): CycleSpan | undefined {
  for (let i = spans.length - 1; i >= 0; i--) if (spans[i].start <= date && date <= spans[i].end) return spans[i];
  return undefined;
}

export interface CycleStats {
  days: number;
  /** 7-day average weight at the start and at the end of the cycle. */
  startWeight?: number;
  endWeight?: number;
  deltaKg?: number;
  /** kg per week over the cycle. */
  ratePerWeek?: number;
  loggedDays: number;
  avgKcal?: number;
  avgProtein?: number;
  sessions: number;
  plannedDone: number;
  planned: number;
  cardioMin: number;
  avgSteps?: number;
  avgScore?: number;
  /** Share of the cycle's days validated (score ≥ 70), 0–100. */
  adherence: number;
  prs: number;
  bodyFat?: { start: number; end: number };
  waist?: { start: number; end: number };
  photos: number;
  /** Progress toward the cycle's target weight, 0–1 (when it has one). */
  goalProgress?: number;
}

export interface CycleStatsInput {
  ledger: Map<DayKey, DayLedger>;
  /** Weight series with its 7-day moving average (GameState.trend.series). */
  trend: { date: DayKey; weight: number; avg: number }[];
  metrics: BodyMetric[];
  prDates: DayKey[];
  photoDates: DayKey[];
}

const inSpan = (span: CycleSpan, d: DayKey) => span.start <= d && d <= span.end;

/** First and last values of a metric inside the span. */
function bounds(metrics: BodyMetric[], span: CycleSpan, key: "bodyFatPct" | "waistCm") {
  const vals = metrics.filter((m) => inSpan(span, m.date) && m[key] != null).sort((a, b) => a.date.localeCompare(b.date));
  return vals.length >= 2 ? { start: vals[0][key]!, end: vals.at(-1)![key]! } : undefined;
}

export function cycleStats(span: CycleSpan, input: CycleStatsInput): CycleStats {
  const days = diffDays(span.start, span.end) + 1;
  const ls: DayLedger[] = [];
  for (const [d, l] of input.ledger) if (inSpan(span, d)) ls.push(l);
  const logged = ls.filter((l) => l.day.entries > 0);
  const tracked = ls.filter((l) => l.score.tracked);
  const planned = ls.filter((l) => l.day.workoutPlanned);
  const steps = ls.map((l) => l.day.steps).filter((s): s is number => s != null && s > 0);

  // Start: average of the first weigh-in of the cycle; end: last one (fallback: weigh-in just before).
  const inside = input.trend.filter((p) => inSpan(span, p.date));
  const before = input.trend.filter((p) => p.date < span.start).at(-1);
  const startPoint = before && diffDays(before.date, span.start) <= 7 ? before : inside[0];
  const endPoint = inside.at(-1);
  const startWeight = startPoint?.avg ?? span.startWeightKg;
  const endWeight = endPoint && endPoint !== startPoint ? endPoint.avg : undefined;
  const deltaKg = startWeight != null && endWeight != null ? endWeight - startWeight : undefined;
  const weeks = startPoint && endPoint ? diffDays(startPoint.date, endPoint.date) / 7 : 0;

  let goalProgress: number | undefined;
  if (span.targetWeightKg != null && startWeight != null && endWeight != null && Math.abs(span.targetWeightKg - startWeight) >= 0.1) {
    goalProgress = Math.min(1, Math.max(0, (endWeight - startWeight) / (span.targetWeightKg - startWeight)));
  }

  return {
    days,
    startWeight,
    endWeight,
    deltaKg,
    ratePerWeek: deltaKg != null && weeks >= 1 ? deltaKg / weeks : undefined,
    loggedDays: logged.length,
    avgKcal: logged.length ? mean(logged.map((l) => l.day.kcal)) : undefined,
    avgProtein: logged.length ? mean(logged.map((l) => l.day.protein)) : undefined,
    sessions: ls.reduce((a, l) => a + l.day.sessionsDone, 0),
    plannedDone: planned.filter((l) => l.day.sessionsDone > 0).length,
    planned: planned.length,
    cardioMin: ls.reduce((a, l) => a + l.day.cardioMin, 0),
    avgSteps: steps.length ? mean(steps) : undefined,
    avgScore: tracked.length ? mean(tracked.map((l) => l.score.total)) : undefined,
    adherence: days ? Math.round((ls.filter((l) => l.validated).length / days) * 100) : 0,
    prs: input.prDates.filter((d) => inSpan(span, d)).length,
    bodyFat: bounds(input.metrics, span, "bodyFatPct"),
    waist: bounds(input.metrics, span, "waistCm"),
    photos: input.photoDates.filter((d) => inSpan(span, d)).length,
    goalProgress,
  };
}
