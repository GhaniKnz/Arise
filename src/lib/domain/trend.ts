import { KCAL_PER_KG } from "./energy";
import { addDays, diffDays, type DayKey } from "@/lib/utils/date";
import { mean } from "@/lib/utils/format";

export interface Point {
  date: DayKey;
  value: number;
}

/** Trailing moving average over `windowDays` calendar days (only days with data count). */
export function movingAverage(points: Point[], windowDays = 7): Point[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((p, i) => {
    const from = addDays(p.date, -(windowDays - 1));
    const vals: number[] = [];
    for (let j = i; j >= 0 && sorted[j].date >= from; j--) vals.push(sorted[j].value);
    return { date: p.date, value: mean(vals) };
  });
}

/** Least-squares slope in value per day. Returns null with < 2 distinct days. */
export function slopePerDay(points: Point[]): number | null {
  if (points.length < 2) return null;
  const origin = points[0].date;
  const xs = points.map((p) => diffDays(origin, p.date));
  const ys = points.map((p) => p.value);
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  return num / den;
}

export interface WeightTrend {
  latest: Point | null;
  average7: number | null;
  /** kg per week, negative = loss. */
  weeklyRate: number | null;
  /** Change of the 7-day average over the last 7 days. */
  weekChange: number | null;
  series: { date: DayKey; weight: number; avg: number }[];
}

export function weightTrend(points: Point[], today: DayKey, lookbackDays = 21): WeightTrend {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const avg = movingAverage(sorted, 7);
  const series = sorted.map((p, i) => ({ date: p.date, weight: p.value, avg: avg[i].value }));
  const latest = sorted.at(-1) ?? null;
  const recent = sorted.filter((p) => p.date >= addDays(today, -lookbackDays));
  const slope = recent.length >= 4 && diffDays(recent[0].date, recent.at(-1)!.date) >= 6 ? slopePerDay(recent) : null;

  const avgNow = avg.at(-1)?.value ?? null;
  const weekAgo = avg.filter((p) => p.date <= addDays(latest?.date ?? today, -7)).at(-1);
  return {
    latest,
    average7: avgNow,
    weeklyRate: slope == null ? null : slope * 7,
    weekChange: avgNow != null && weekAgo ? avgNow - weekAgo.value : null,
    series,
  };
}

export interface AdaptiveTdee {
  tdee: number;
  avgIntake: number;
  weeklyRate: number;
  daysLogged: number;
  confidence: "low" | "medium" | "high";
}

/**
 * Energy-balance estimate of real maintenance:
 * maintenance ≈ average intake − (weight trend change × 7700 kcal/kg) / days.
 * Only days with meaningful logging (≥ 800 kcal) count as intake.
 */
export function adaptiveTdee(
  weights: Point[],
  intake: Point[],
  today: DayKey,
  windowDays = 28,
): AdaptiveTdee | null {
  const from = addDays(today, -windowDays + 1);
  const w = weights.filter((p) => p.date >= from && p.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  const k = intake.filter((p) => p.date >= from && p.date <= today && p.value >= 800);
  if (w.length < 4 || k.length < 10) return null;
  if (diffDays(w[0].date, w.at(-1)!.date) < 10) return null;
  const slope = slopePerDay(w);
  if (slope == null) return null;
  const avgIntake = mean(k.map((p) => p.value));
  const tdee = avgIntake - slope * KCAL_PER_KG;
  if (!Number.isFinite(tdee) || tdee < 1000 || tdee > 6000) return null;
  const confidence = k.length >= 21 && w.length >= 12 ? "high" : k.length >= 14 ? "medium" : "low";
  return { tdee: Math.round(tdee / 10) * 10, avgIntake: Math.round(avgIntake), weeklyRate: slope * 7, daysLogged: k.length, confidence };
}

export interface Projection {
  weeksToGoal: number | null;
  etaDate: DayKey | null;
  rateUsed: number;
  basis: "observed" | "planned";
  remainingKg: number;
  onTrack: boolean;
  curve: { date: DayKey; projected: number }[];
}

/**
 * Projects when the goal weight may be reached. It's an estimate that
 * must be recomputed on each new weigh-in — never a promise.
 */
export function projectGoal(opts: {
  currentKg: number;
  targetKg: number;
  today: DayKey;
  observedWeeklyRate: number | null;
  plannedWeeklyRate: number;
}): Projection {
  const { currentKg, targetKg, today, observedWeeklyRate, plannedWeeklyRate } = opts;
  const remaining = targetKg - currentKg;
  const direction = Math.sign(remaining);
  const observedUsable = observedWeeklyRate != null && Math.sign(observedWeeklyRate) === direction && Math.abs(observedWeeklyRate) >= 0.05;
  const rate = observedUsable ? observedWeeklyRate! : plannedWeeklyRate;
  const basis = observedUsable ? "observed" : "planned";

  if (Math.abs(remaining) < 0.1) {
    return { weeksToGoal: 0, etaDate: today, rateUsed: rate, basis, remainingKg: 0, onTrack: true, curve: [{ date: today, projected: currentKg }] };
  }
  if (rate === 0 || Math.sign(rate) !== direction) {
    return { weeksToGoal: null, etaDate: null, rateUsed: rate, basis, remainingKg: remaining, onTrack: false, curve: [] };
  }
  const weeks = remaining / rate;
  const days = Math.round(weeks * 7);
  const curve: { date: DayKey; projected: number }[] = [];
  const steps = Math.min(Math.ceil(weeks), 104);
  for (let i = 0; i <= steps; i++) {
    const projected = currentKg + rate * i;
    curve.push({ date: addDays(today, i * 7), projected: direction < 0 ? Math.max(projected, targetKg) : Math.min(projected, targetKg) });
  }
  return { weeksToGoal: weeks, etaDate: addDays(today, days), rateUsed: rate, basis, remainingKg: remaining, onTrack: true, curve };
}
