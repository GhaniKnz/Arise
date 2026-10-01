"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { db } from "@/lib/db";
import type { Profile } from "@/lib/db/types";
import { useToday } from "@/lib/db/hooks";
import { aggregateDays, type RawData } from "@/lib/domain/aggregate";
import { buildLedger, type DayData, type Ledger } from "@/lib/domain/game";
import { derivePRs, type PREvent } from "@/lib/domain/strength";
import { adaptiveTdee, weightTrend, type AdaptiveTdee, type Point, type WeightTrend } from "@/lib/domain/trend";
import { EXERCISE_BY_ID } from "@/lib/data/exercises";
import { bossPath, bossStates, type BossState } from "@/lib/domain/bosses";
import { cycleAt, cycleSpans, type CycleSpan } from "@/lib/domain/cycles";
import { addDays, type DayKey } from "@/lib/utils/date";

export interface GameState {
  ready: boolean;
  profile: Profile | null;
  today: DayKey;
  raw: RawData;
  days: DayData[];
  dayMap: Map<DayKey, DayData>;
  ledger: Ledger;
  weights: Point[];
  trend: WeightTrend;
  adaptive: AdaptiveTdee | null;
  prs: PREvent[];
  currentWeight: number | null;
  /** Weight-goal bosses with their defeated state. */
  bosses: BossState[];
  /** Cut / bulk / maintenance cycles, oldest first (the last one runs). */
  cycles: CycleSpan[];
}

const EMPTY_RAW: RawData = { entries: [], logs: [], sessions: [], sets: [], cardio: [], metrics: [] };

const GameContext = createContext<GameState | null>(null);

function firstDate(raw: RawData, fallback: DayKey): DayKey {
  let min = fallback;
  const check = (d: string) => {
    if (d < min) min = d;
  };
  raw.entries.forEach((e) => check(e.date));
  raw.logs.forEach((e) => check(e.date));
  raw.sessions.forEach((e) => check(e.date));
  raw.metrics.forEach((e) => check(e.date));
  raw.cardio.forEach((e) => check(e.date));
  return min;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const today = useToday();
  const data = useLiveQuery(async () => {
    const [profile, entries, logs, sessions, sets, cardio, metrics, customExercises, cycles] = await Promise.all([
      db.profile.get("me"),
      db.foodEntries.toArray(),
      db.dailyLogs.toArray(),
      db.sessions.toArray(),
      db.sets.toArray(),
      db.cardio.toArray(),
      db.bodyMetrics.toArray(),
      db.customExercises.toArray(),
      db.cycles.toArray(),
    ]);
    const weightedOverride = new Map(customExercises.map((e) => [e.id, e.weighted]));
    return { profile: profile ?? null, raw: { entries, logs, sessions, sets, cardio, metrics } as RawData, weightedOverride, cycles };
  }, []);

  const state = useMemo<GameState>(() => {
    const profile = data?.profile ?? null;
    const raw = data?.raw ?? EMPTY_RAW;
    const schedule = profile?.schedule ?? [null, null, null, null, null, null, null];
    const floor = addDays(today, -3 * 365);
    let from = firstDate(raw, profile?.startDate ?? today);
    if (from < floor) from = floor;
    if (from > today) from = today;

    const days = aggregateDays(raw, from, today, schedule);
    const dayMap = new Map(days.map((d) => [d.date, d]));

    const doneIds = new Set(raw.sessions.filter((s) => s.status === "done").map((s) => s.id));
    const overrides = data?.weightedOverride;
    const prs = derivePRs(
      raw.sets.filter((s) => doneIds.has(s.sessionId)),
      (id) => overrides?.get(id) ?? EXERCISE_BY_ID.get(id)?.weighted ?? true,
    );
    const prsByDate = new Map<DayKey, number>();
    for (const p of prs) prsByDate.set(p.date, (prsByDate.get(p.date) ?? 0) + 1);

    const weights: Point[] = raw.metrics
      .filter((m) => m.weightKg != null && m.date <= today)
      .map((m) => ({ date: m.date, value: m.weightKg! }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const trend = weightTrend(weights, today);

    const bosses = profile ? bossStates(bossPath(profile.startWeightKg, profile.targetWeightKg), profile.startWeightKg, trend.series) : [];

    const cycles = profile
      ? cycleSpans(data?.cycles ?? [], { goal: profile.goal, startDate: profile.startDate, startWeightKg: profile.startWeightKg, targetWeightKg: profile.targetWeightKg, kcal: profile.targets.kcal }, today)
      : [];
    // Days of finished cycles keep the goal (and calorie target) they were lived with.
    const dayContext = (date: DayKey) => {
      const c = cycleAt(cycles, date);
      return c && !c.ongoing ? { goal: c.goal, kcal: c.kcalTarget } : undefined;
    };

    const ledger = buildLedger({
      days,
      targets: profile?.targets ?? { kcal: 2000, protein: 150, carbs: 200, fat: 65, fiber: 30, waterMl: 2500, steps: 8000, sleepMin: 450 },
      goal: profile?.goal ?? "maintain",
      quests: profile?.quests ?? [],
      prsByDate,
      today,
      bossEvents: bosses.filter((b) => b.defeatedOn).map((b) => ({ date: b.defeatedOn!, name: b.name, xp: b.xp })),
      dayContext,
    });
    const intake: Point[] = days.filter((d) => d.entries > 0 && d.date < today).map((d) => ({ date: d.date, value: d.kcal }));
    const adaptive = adaptiveTdee(weights, intake, addDays(today, -1));

    return {
      ready: data !== undefined,
      profile,
      today,
      raw,
      days,
      dayMap,
      ledger,
      weights,
      trend,
      adaptive,
      prs,
      currentWeight: weights.at(-1)?.value ?? profile?.startWeightKg ?? null,
      bosses,
      cycles,
    };
  }, [data, today]);

  return <GameContext.Provider value={state}>{children}</GameContext.Provider>;
}

export function useGame(): GameState {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside <GameProvider>");
  return ctx;
}
