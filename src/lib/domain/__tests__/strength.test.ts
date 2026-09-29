import { describe, expect, it } from "vitest";
import type { WorkoutSet } from "@/lib/db/types";
import { bestsFromSets, derivePRs, detectPRs, e1rm, progressionHint } from "../strength";

const set = (p: Partial<WorkoutSet>): WorkoutSet => ({
  id: Math.random().toString(),
  createdAt: "",
  updatedAt: "",
  sessionId: "s1",
  exerciseId: "bench",
  date: "2026-01-01",
  order: 0,
  weightKg: 80,
  reps: 8,
  warmup: false,
  done: true,
  ...p,
});

describe("strength", () => {
  it("computes Epley e1RM", () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(80, 8)).toBeCloseTo(101.33, 1);
  });

  it("never flags a PR on the first ever set", () => {
    expect(detectPRs(set({}), bestsFromSets([]))).toEqual([]);
  });

  it("detects weight, e1rm and rep PRs", () => {
    const bests = bestsFromSets([set({ weightKg: 80, reps: 8 })]);
    expect(detectPRs(set({ weightKg: 85, reps: 6 }), bests)).toEqual(expect.arrayContaining(["weight", "e1rm"]));
    expect(detectPRs(set({ weightKg: 80, reps: 9 }), bests)).toEqual(expect.arrayContaining(["reps", "e1rm", "volume"]));
    expect(detectPRs(set({ weightKg: 75, reps: 8 }), bests)).toEqual([]);
    expect(detectPRs(set({ weightKg: 90, reps: 2, warmup: true }), bests)).toEqual([]);
  });

  it("derives one PR event per exercise per session", () => {
    const sets = [
      set({ sessionId: "a", date: "2026-01-01", completedAt: "2026-01-01T10:00:00Z", weightKg: 80, reps: 8 }),
      set({ sessionId: "b", date: "2026-01-04", completedAt: "2026-01-04T10:00:00Z", weightKg: 82.5, reps: 8 }),
      set({ sessionId: "b", date: "2026-01-04", completedAt: "2026-01-04T10:05:00Z", weightKg: 85, reps: 6, order: 1 }),
      set({ sessionId: "c", date: "2026-01-08", completedAt: "2026-01-08T10:00:00Z", weightKg: 80, reps: 8 }),
    ];
    const prs = derivePRs(sets);
    expect(prs).toHaveLength(1);
    expect(prs[0].sessionId).toBe("b");
    expect(prs[0].kinds).toEqual(expect.arrayContaining(["weight", "e1rm"]));
  });

  it("suggests double progression", () => {
    const up = progressionHint([{ weightKg: 80, reps: 10 }, { weightKg: 80, reps: 10 }], 8, 10);
    expect(up?.weightKg).toBe(82.5);
    const same = progressionHint([{ weightKg: 80, reps: 8 }], 8, 10);
    expect(same?.reps).toBe(9);
  });
});
