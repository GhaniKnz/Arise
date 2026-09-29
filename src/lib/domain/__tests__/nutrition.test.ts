import { describe, expect, it } from "vitest";
import { nutritionScore, per100OfIngredients, scaleNutrients, tierFor } from "../nutrition";

const chicken = { kcal: 121, protein: 23, carbs: 0, fat: 2.6, fiber: 0, sugar: 0, satFat: 0.7, salt: 0.15, nova: 1 as const };
const cookie = { kcal: 490, protein: 5.5, carbs: 65, fat: 23, fiber: 2, sugar: 35, satFat: 12, salt: 0.7, nova: 4 as const };
const skyr = { kcal: 63, protein: 11, carbs: 4, fat: 0.2, fiber: 0, sugar: 4, satFat: 0.1, salt: 0.1, nova: 1 as const };
const broccoli = { kcal: 34, protein: 2.8, carbs: 4, fat: 0.4, fiber: 2.6, sugar: 1.7, satFat: 0.1, salt: 0.03, nova: 1 as const };
const soda = { kcal: 42, protein: 0, carbs: 10.6, fat: 0, fiber: 0, sugar: 10.6, satFat: 0, salt: 0, nova: 4 as const, unit: "ml" as const, category: "drinks" as const };
const oliveOil = { kcal: 900, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, satFat: 14, salt: 0, nova: 2 as const };
const banana = { kcal: 90, protein: 1.1, carbs: 20, fat: 0.3, fiber: 2.6, sugar: 17, satFat: 0.1, salt: 0, nova: 1 as const };
const whiteRice = { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1, satFat: 0.1, salt: 0, nova: 1 as const };
const eggs = { kcal: 140, protein: 12.5, carbs: 0.7, fat: 9.8, fiber: 0, sugar: 0.4, satFat: 2.8, salt: 0.3, nova: 1 as const };

describe("nutritionScore", () => {
  it("rates lean protein as excellent for a cut", () => {
    expect(nutritionScore(chicken, "cut").score).toBeGreaterThanOrEqual(88);
    expect(nutritionScore(skyr, "cut").score).toBeGreaterThanOrEqual(88);
  });
  it("rates an industrial cookie low but not zero", () => {
    const s = nutritionScore(cookie, "cut");
    expect(s.score).toBeGreaterThan(5);
    expect(s.score).toBeLessThan(40);
    expect(s.reasons.some((r) => r.kind === "minus")).toBe(true);
    expect(s.verdict).not.toMatch(/mauvais|interdit/i);
  });
  it("keeps whole foods in a good range", () => {
    expect(nutritionScore(broccoli, "cut").score).toBeGreaterThanOrEqual(75);
    expect(nutritionScore(banana, "cut").score).toBeGreaterThanOrEqual(55);
    expect(nutritionScore(eggs, "cut").score).toBeGreaterThanOrEqual(65);
    const rice = nutritionScore(whiteRice, "cut").score;
    expect(rice).toBeGreaterThanOrEqual(45);
    expect(rice).toBeLessThan(80);
  });
  it("places sugary sodas and pure fats lower", () => {
    expect(nutritionScore(soda, "cut").score).toBeLessThan(35);
    const oil = nutritionScore(oliveOil, "cut").score;
    expect(oil).toBeLessThan(50);
    expect(oil).toBeGreaterThan(nutritionScore(cookie, "cut").score);
  });
  it("is more lenient on energy density for a bulk", () => {
    expect(nutritionScore(oliveOil, "bulk").score).toBeGreaterThan(nutritionScore(oliveOil, "cut").score);
  });
  it("maps tiers", () => {
    expect(tierFor(90)).toBe("excellent");
    expect(tierFor(10)).toBe("occasional");
  });
});

describe("scaling", () => {
  it("scales per-100g values", () => {
    const n = scaleNutrients(chicken, 180);
    expect(n.kcal).toBeCloseTo(217.8);
    expect(n.protein).toBeCloseTo(41.4);
  });
  it("computes the per-100g profile of a recipe", () => {
    const p = per100OfIngredients([
      { name: "a", grams: 100, per100: { kcal: 100, protein: 10, carbs: 0, fat: 0 } },
      { name: "b", grams: 100, per100: { kcal: 300, protein: 0, carbs: 50, fat: 10 } },
    ]);
    expect(p.kcal).toBeCloseTo(200);
    expect(p.protein).toBeCloseTo(5);
  });
});
