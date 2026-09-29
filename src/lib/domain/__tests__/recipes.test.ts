import { describe, expect, it } from "vitest";
import { FOOD_BY_ID } from "@/lib/data/foods";
import { RECIPE_PHOTOS } from "@/lib/data/recipe-photos";
import { RECIPES } from "@/lib/data/recipes";
import { SHOP_BY_ID, SHOP_ITEMS } from "@/lib/data/shop";
import { autoTags, recipeCost, recipeNutrition, recipeToIngredients, shoppingList } from "../recipes";

describe("recipe catalogue", () => {
  it("links every shop item to the food database", () => {
    for (const s of SHOP_ITEMS) expect(FOOD_BY_ID.has(s.foodId), s.id).toBe(true);
  });

  it("uses only known ingredients, has a credited photo and sane numbers", () => {
    const slugs = new Set<string>();
    for (const r of RECIPES) {
      expect(slugs.has(r.slug), r.slug).toBe(false);
      slugs.add(r.slug);
      for (const i of r.ingredients) expect(SHOP_BY_ID.has(i.item), `${r.slug}: ${i.item}`).toBe(true);
      expect(RECIPE_PHOTOS[r.slug], `photo ${r.slug}`).toBeDefined();
      const n = recipeNutrition(r).perServing;
      expect(n.kcal, r.slug).toBeGreaterThan(150);
      expect(n.kcal, r.slug).toBeLessThan(1000);
      const cost = recipeCost(r, "discount").perServing;
      expect(cost, r.slug).toBeGreaterThan(0.2);
      expect(cost, r.slug).toBeLessThan(8);
      expect(recipeCost(r, "super").perServing).toBeGreaterThanOrEqual(cost);
      expect(r.steps.length).toBeGreaterThan(1);
    }
    expect(RECIPES.length).toBeGreaterThanOrEqual(30);
  });

  it("computes a meal prep classic correctly", () => {
    const r = RECIPES.find((x) => x.slug === "bowl-poulet-riz")!;
    const n = recipeNutrition(r).perServing;
    expect(n.protein).toBeGreaterThan(35);
    expect(autoTags(r)).toContain("high_protein");
    const items = recipeToIngredients(r, 1);
    const chicken = items.find((i) => i.foodId === "b:chicken_breast_raw")!;
    expect(chicken.grams).toBe(150);
  });

  it("builds a shopping list with whole packs, pantry excluded", () => {
    const r = RECIPES.find((x) => x.slug === "chili-con-carne")!;
    const { byAisle, total } = shoppingList([{ recipe: r, servings: 8 }], "discount");
    const meat = byAisle.get("meat")!;
    expect(meat[0].packs).toBe(3); // 1 kg of beef in 400 g packs
    expect([...byAisle.values()].flat().some((l) => l.item.pantry)).toBe(false);
    expect(total).toBeGreaterThan(5);
  });
});
