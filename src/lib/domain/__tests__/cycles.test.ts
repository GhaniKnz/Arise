import { describe, expect, it } from "vitest";
import type { Cycle, Targets } from "@/lib/db/types";
import { addDays } from "@/lib/utils/date";
import { cycleAt, cycleSpans, cycleStats } from "../cycles";
import { buildLedger, type DayData } from "../game";

const profile = { goal: "cut" as const, startDate: "2026-01-01", startWeightKg: 90, targetWeightKg: 80, kcal: 2200 };
const today = "2026-06-30";
const row = (c: Partial<Cycle> & Pick<Cycle, "goal" | "startDate">): Cycle => ({ id: c.startDate, createdAt: c.startDate, updatedAt: c.startDate, ...c });

describe("cycleSpans", () => {
  it("uses the profile goal as the running cycle before any switch", () => {
    const spans = cycleSpans([], profile, today);
    expect(spans).toHaveLength(1);
    expect(spans[0]).toMatchObject({ id: "initial", goal: "cut", start: "2026-01-01", end: today, ongoing: true, name: "Sèche" });
  });

  it("closes a cycle the day before the next one and keeps the last one running", () => {
    const spans = cycleSpans([row({ goal: "bulk", startDate: "2026-04-01" }), row({ goal: "cut", startDate: "2026-01-01" })], profile, today);
    expect(spans.map((s) => [s.goal, s.start, s.end, s.ongoing])).toEqual([
      ["cut", "2026-01-01", "2026-03-31", false],
      ["bulk", "2026-04-01", today, true],
    ]);
    expect(cycleAt(spans, "2026-03-31")?.goal).toBe("cut");
    expect(cycleAt(spans, "2026-04-01")?.goal).toBe("bulk");
    expect(cycleAt(spans, "2025-12-31")).toBeUndefined();
  });

  it("honours explicit end dates and custom names", () => {
    const spans = cycleSpans([row({ goal: "maintain", startDate: "2026-02-01", endDate: "2026-02-20", name: " Vacances " })], profile, today);
    expect(spans[0]).toMatchObject({ end: "2026-02-20", ongoing: false, name: "Vacances" });
  });
});

const targets: Targets = { kcal: 2200, protein: 170, carbs: 220, fat: 70, fiber: 30, waterMl: 3000, steps: 10000, sleepMin: 450 };
const day = (date: string, kcal: number, extra: Partial<DayData> = {}): DayData => ({
  date,
  kcal,
  protein: 175,
  carbs: 200,
  fat: 70,
  fiber: 30,
  entries: 6,
  steps: 9000,
  sessionsDone: 0,
  workoutPlanned: false,
  cardioMin: 0,
  volume: 0,
  sets: 0,
  ...extra,
});

describe("ledger with past cycles", () => {
  it("judges past days with their own goal and calorie target", () => {
    // 2 100 kcal is a good cut day at 2 200 kcal, but misses a 2 900 kcal bulk.
    const days = [day("2026-03-30", 2100)];
    const asBulk = buildLedger({ days, targets: { ...targets, kcal: 2900 }, goal: "bulk", quests: ["calories"], prsByDate: new Map(), today: "2026-04-02" });
    expect(asBulk.days.get("2026-03-30")!.quests[0].done).toBe(false);
    const withHistory = buildLedger({
      days,
      targets: { ...targets, kcal: 2900 },
      goal: "bulk",
      quests: ["calories"],
      prsByDate: new Map(),
      today: "2026-04-02",
      dayContext: (d) => (d < "2026-04-01" ? { goal: "cut", kcal: 2200 } : undefined),
    });
    expect(withHistory.days.get("2026-03-30")!.quests[0].done).toBe(true);
  });
});

describe("cycleStats", () => {
  it("summarises weight change, nutrition, training and adherence", () => {
    const spans = cycleSpans([row({ goal: "cut", startDate: "2026-01-01", targetWeightKg: 86 }), row({ goal: "bulk", startDate: "2026-01-29" })], profile, today);
    const cut = spans[0];
    const days: DayData[] = [];
    for (let i = 0; i < 28; i++) days.push(day(addDays("2026-01-01", i), 2100, { sessionsDone: i % 2, workoutPlanned: i % 2 === 1, cardioMin: 20 }));
    const ledger = buildLedger({ days, targets, goal: "cut", quests: ["calories", "protein", "steps"], prsByDate: new Map(), today });
    const trend = Array.from({ length: 29 }, (_, i) => ({ date: addDays("2026-01-01", i), weight: 90 - i * 0.1, avg: 90 - i * 0.1 }));
    const stats = cycleStats(cut, {
      ledger: ledger.days,
      trend,
      metrics: [
        { id: "a", createdAt: "", updatedAt: "", date: "2026-01-01", waistCm: 92 },
        { id: "b", createdAt: "", updatedAt: "", date: "2026-01-27", waistCm: 89 },
      ],
      prDates: ["2026-01-10", "2026-02-10"],
      photoDates: ["2026-01-02", "2026-01-28", "2026-01-29"],
    });
    expect(stats.days).toBe(28);
    expect(stats.startWeight).toBeCloseTo(90);
    expect(stats.endWeight).toBeCloseTo(87.3);
    expect(stats.deltaKg).toBeCloseTo(-2.7);
    expect(stats.ratePerWeek).toBeCloseTo(-0.7, 1);
    expect(stats.goalProgress).toBeCloseTo(0.675);
    expect(stats.avgKcal).toBe(2100);
    expect(stats.sessions).toBe(14);
    expect(stats.plannedDone).toBe(14);
    expect(stats.cardioMin).toBe(560);
    expect(stats.prs).toBe(1);
    expect(stats.photos).toBe(2);
    expect(stats.waist).toEqual({ start: 92, end: 89 });
    expect(stats.bodyFat).toBeUndefined();
    expect(stats.adherence).toBeGreaterThan(0);
  });
});
