import type { BodyMetric, CardioSession, DailyLog, FoodEntry, Session, WorkoutSet } from "@/lib/db/types";
import { rangeKeys, weekdayIndex, type DayKey } from "@/lib/utils/date";
import type { DayData } from "./game";

export interface RawData {
  entries: FoodEntry[];
  logs: DailyLog[];
  sessions: Session[];
  sets: WorkoutSet[];
  cardio: CardioSession[];
  metrics: BodyMetric[];
}

export function emptyDay(date: DayKey, workoutPlanned: boolean): DayData {
  return { date, kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, entries: 0, sessionsDone: 0, workoutPlanned, cardioMin: 0, volume: 0, sets: 0 };
}

/** Builds one DayData per calendar day in [from, to], including empty days. */
export function aggregateDays(raw: RawData, from: DayKey, to: DayKey, schedule: (string | null)[]): DayData[] {
  const days = new Map<DayKey, DayData>();
  for (const k of rangeKeys(from, to)) days.set(k, emptyDay(k, schedule[weekdayIndex(k)] != null));
  const get = (k: DayKey) => days.get(k);

  for (const e of raw.entries) {
    const d = get(e.date);
    if (!d) continue;
    d.kcal += e.kcal;
    d.protein += e.protein;
    d.carbs += e.carbs;
    d.fat += e.fat;
    d.fiber += e.fiber;
    d.entries++;
  }
  for (const l of raw.logs) {
    const d = get(l.date);
    if (!d) continue;
    d.steps = l.steps;
    d.waterMl = l.waterMl;
    d.sleepMin = l.sleepMin;
    d.energy = l.energy;
  }
  const doneSessions = new Set<string>();
  for (const s of raw.sessions) {
    if (s.status !== "done") continue;
    doneSessions.add(s.id);
    const d = get(s.date);
    if (d) d.sessionsDone++;
  }
  for (const s of raw.sets) {
    if (!s.done || s.warmup || !doneSessions.has(s.sessionId)) continue;
    const d = get(s.date);
    if (!d) continue;
    d.sets++;
    d.volume += s.weightKg * s.reps;
  }
  for (const c of raw.cardio) {
    const d = get(c.date);
    if (d) d.cardioMin += c.durationMin;
  }
  for (const m of raw.metrics) {
    const d = get(m.date);
    if (d && m.weightKg != null) d.weightKg = m.weightKg;
  }
  return [...days.values()];
}
