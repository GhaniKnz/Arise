import type { CardioSession, DailyLog, Session } from "@/lib/db/types";
import type { DayKey } from "@/lib/utils/date";

/** Rough active-energy estimate when no wearable value is available. */
export function activeKcalEstimate(opts: { steps?: number; weightKg: number; cardio: CardioSession[]; sessions: Session[]; log?: DailyLog | null }): number {
  if (opts.log?.activeKcal != null) return opts.log.activeKcal;
  const stepsKcal = (opts.steps ?? 0) * 0.0005 * opts.weightKg;
  const cardioKcal = opts.cardio.reduce((a, c) => a + (c.kcal ?? 0), 0);
  const liftingMin = opts.sessions.reduce((a, s) => a + sessionMinutes(s), 0);
  return Math.round(stepsKcal + cardioKcal + liftingMin * 0.05 * opts.weightKg);
}

export function sessionMinutes(s: Session, now = Date.now()): number {
  const end = s.endedAt ? new Date(s.endedAt).getTime() : now;
  return Math.max(0, (end - new Date(s.startedAt).getTime()) / 60000);
}

export type RecoveryLevel = "good" | "ok" | "low" | "unknown";

export function recoveryLevel(sleepMin: number | undefined, energy: number | undefined, sleepTarget: number): RecoveryLevel {
  if (sleepMin == null && energy == null) return "unknown";
  const s = sleepMin != null ? Math.min(1.1, sleepMin / sleepTarget) : 0.85;
  const e = energy != null ? energy / 10 : 0.7;
  const score = s * 0.6 + e * 0.4;
  if (score >= 0.85) return "good";
  if (score >= 0.68) return "ok";
  return "low";
}

export const RECOVERY_META: Record<RecoveryLevel, { label: string; color: string }> = {
  good: { label: "Bonne", color: "var(--color-good)" },
  ok: { label: "Correcte", color: "var(--color-arise)" },
  low: { label: "À surveiller", color: "var(--color-warn)" },
  unknown: { label: "Non renseignée", color: "var(--color-ink-3)" },
};

export function sessionsOn(sessions: Session[], date: DayKey) {
  return sessions.filter((s) => s.date === date);
}
