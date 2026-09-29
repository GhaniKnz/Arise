import { describe, expect, it } from "vitest";
import type { Targets } from "@/lib/db/types";
import { addDays } from "@/lib/utils/date";
import { ALL_QUESTS, buildLedger, dailyScore, levelInfo, questsForDay, rankFor, type DayData } from "../game";

const targets: Targets = { kcal: 2200, protein: 170, carbs: 220, fat: 70, fiber: 30, waterMl: 3000, steps: 10000, sleepMin: 450 };
const perfect = (date: string, planned = true): DayData => ({
  date,
  kcal: 2150,
  protein: 172,
  carbs: 210,
  fat: 68,
  fiber: 30,
  entries: 8,
  steps: 11000,
  waterMl: 3100,
  sleepMin: 460,
  energy: 8,
  sessionsDone: planned ? 1 : 0,
  workoutPlanned: planned,
  cardioMin: 0,
  volume: 8000,
  sets: 18,
});
const empty = (date: string): DayData => ({ date, kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, entries: 0, sessionsDone: 0, workoutPlanned: false, cardioMin: 0, volume: 0, sets: 0 });

describe("quests & score", () => {
  it("completes every quest on a perfect day", () => {
    const qs = questsForDay(perfect("2026-01-05"), targets, "cut", ALL_QUESTS);
    expect(qs).toHaveLength(6);
    expect(qs.every((q) => q.done)).toBe(true);
    expect(dailyScore(perfect("2026-01-05"), targets, "cut", ALL_QUESTS).total).toBe(100);
  });

  it("hides the workout quest on rest days but keeps the score fair", () => {
    const day = perfect("2026-01-07", false);
    expect(questsForDay(day, targets, "cut", ALL_QUESTS).map((q) => q.id)).not.toContain("workout");
    expect(dailyScore(day, targets, "cut", ALL_QUESTS).total).toBe(100);
  });

  it("fails the calorie quest when far over target", () => {
    const day = { ...perfect("2026-01-05"), kcal: 3000 };
    const q = questsForDay(day, targets, "cut", ALL_QUESTS).find((x) => x.id === "calories")!;
    expect(q.done).toBe(false);
    expect(dailyScore(day, targets, "cut", ["calories"]).total).toBeLessThan(40);
  });

  it("marks an empty day as untracked with score 0", () => {
    const s = dailyScore(empty("2026-01-05"), targets, "cut", ALL_QUESTS);
    expect(s.tracked).toBe(false);
    expect(s.total).toBe(0);
  });
});

describe("levels", () => {
  it("levels up on the right thresholds", () => {
    expect(levelInfo(0).level).toBe(1);
    expect(levelInfo(399).level).toBe(1);
    expect(levelInfo(400).level).toBe(2);
    expect(levelInfo(400 + 500).level).toBe(3);
    expect(rankFor(1)).toBe("E");
    expect(rankFor(25)).toBe("C");
    expect(rankFor(70)).toBe("S");
  });
});

describe("ledger", () => {
  it("accumulates XP, streaks and stats", () => {
    const start = "2026-01-05";
    const days = Array.from({ length: 10 }, (_, i) => perfect(addDays(start, i), i % 2 === 0));
    days[3] = empty(addDays(start, 3));
    const today = addDays(start, 9);
    const ledger = buildLedger({ days, targets, goal: "cut", quests: ALL_QUESTS, prsByDate: new Map([[start, 2]]), today });
    expect(ledger.streak.current).toBe(6);
    expect(ledger.streak.best).toBe(6);
    expect(ledger.level.totalXp).toBeGreaterThan(4000);
    expect(ledger.stats.STR).toBeGreaterThan(10);
    expect(ledger.prCount).toBe(2);
    expect(ledger.days.get(start)!.allQuestsDone).toBe(true);
  });

  it("does not break the streak because today is not finished yet", () => {
    const start = "2026-01-05";
    const days = [perfect(start), perfect(addDays(start, 1)), empty(addDays(start, 2))];
    const ledger = buildLedger({ days, targets, goal: "cut", quests: ALL_QUESTS, prsByDate: new Map(), today: addDays(start, 2) });
    expect(ledger.streak.current).toBe(2);
  });
});
