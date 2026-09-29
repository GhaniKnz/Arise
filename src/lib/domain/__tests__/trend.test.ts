import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/utils/date";
import { adaptiveTdee, movingAverage, projectGoal, slopePerDay, weightTrend } from "../trend";

const start = "2026-03-01";
const series = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => ({ date: addDays(start, i), value: f(i) }));

describe("trend", () => {
  it("computes a trailing 7-day average", () => {
    const avg = movingAverage(series(10, (i) => i));
    expect(avg[6].value).toBeCloseTo(3);
    expect(avg[9].value).toBeCloseTo(6);
  });

  it("computes the regression slope", () => {
    expect(slopePerDay(series(14, (i) => 80 - 0.1 * i))).toBeCloseTo(-0.1);
  });

  it("reports a weekly rate that ignores daily noise", () => {
    const pts = series(21, (i) => 80 - 0.08 * i + (i % 2 ? 0.6 : -0.6));
    const t = weightTrend(pts, addDays(start, 20));
    expect(t.weeklyRate).toBeCloseTo(-0.56, 1);
  });

  it("estimates adaptive maintenance from intake and weight change", () => {
    // Losing 0.5 kg/week while eating 2200 → maintenance ≈ 2200 + 550 = 2750
    const weights = series(28, (i) => 80 - (0.5 / 7) * i);
    const intake = series(28, () => 2200);
    const res = adaptiveTdee(weights, intake, addDays(start, 27));
    expect(res).not.toBeNull();
    expect(res!.tdee).toBeGreaterThan(2700);
    expect(res!.tdee).toBeLessThan(2800);
    expect(res!.confidence).toBe("high");
  });

  it("returns null without enough data", () => {
    expect(adaptiveTdee(series(3, () => 80), series(5, () => 2000), addDays(start, 5))).toBeNull();
  });

  it("projects goal date with observed rate", () => {
    const p = projectGoal({ currentKg: 80, targetKg: 73, today: start, observedWeeklyRate: -0.5, plannedWeeklyRate: -0.48 });
    expect(p.basis).toBe("observed");
    expect(p.weeksToGoal).toBeCloseTo(14);
    expect(p.curve.at(-1)!.projected).toBeCloseTo(73);
  });

  it("falls back to planned rate when trend goes the wrong way", () => {
    const p = projectGoal({ currentKg: 80, targetKg: 73, today: start, observedWeeklyRate: 0.2, plannedWeeklyRate: -0.5 });
    expect(p.basis).toBe("planned");
    expect(p.weeksToGoal).toBeCloseTo(14);
  });
});
