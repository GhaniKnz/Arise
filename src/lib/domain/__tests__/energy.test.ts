import { describe, expect, it } from "vitest";
import { bmr, cardioKcal, computeTargets } from "../energy";

describe("energy", () => {
  it("computes Mifflin-St Jeor BMR", () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 1780
    expect(bmr({ sex: "male", age: 30, heightCm: 180, weightKg: 80 })).toBeCloseTo(1780);
    expect(bmr({ sex: "female", age: 30, heightCm: 165, weightKg: 60 })).toBeCloseTo(1320.25);
  });

  it("builds sane cut targets", () => {
    const t = computeTargets({ sex: "male", age: 30, heightCm: 180, weightKg: 80, activity: "moderate", goal: "cut", weeklyRatePct: 0.6, targetWeightKg: 73 });
    expect(t.maintenance).toBeGreaterThan(2700);
    expect(t.maintenance).toBeLessThan(2800);
    expect(t.dailyDelta).toBeLessThan(-450);
    expect(t.dailyDelta).toBeGreaterThan(-600);
    expect(t.protein).toBeGreaterThanOrEqual(160);
    expect(t.protein).toBeLessThanOrEqual(175);
    const kcalFromMacros = t.protein * 4 + t.carbs * 4 + t.fat * 9;
    expect(Math.abs(kcalFromMacros - t.kcal)).toBeLessThan(40);
    expect(t.fiber).toBeGreaterThanOrEqual(25);
  });

  it("caps the deficit and never goes below the floor", () => {
    const t = computeTargets({ sex: "female", age: 40, heightCm: 155, weightKg: 50, activity: "sedentary", goal: "cut", weeklyRatePct: 1.5 });
    expect(t.kcal).toBeGreaterThanOrEqual(1200);
  });

  it("uses adaptive TDEE when provided", () => {
    const t = computeTargets({ sex: "male", age: 30, heightCm: 180, weightKg: 80, activity: "moderate", goal: "maintain", weeklyRatePct: 0, adaptiveTdee: 2500 });
    expect(t.kcal).toBe(2500);
  });

  it("estimates incline walking energy higher than flat walking", () => {
    const flat = cardioKcal("walk", 45, 80, 0, 5.5);
    const incline = cardioKcal("incline_walk", 45, 80, 10, 5.5);
    expect(incline).toBeGreaterThan(flat * 1.5);
    expect(incline).toBeGreaterThan(350);
    expect(incline).toBeLessThan(600);
  });
});
